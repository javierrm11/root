"use server";

import { redirect } from "next/navigation";
import { createEmptyCard } from "ts-fsrs";
import { z } from "zod";
import { SYSTEM_BASE, fileParts, generateJson, generateText, type AiPart } from "@/lib/ai";
import { invalid, mutate } from "@/lib/actions";
import type { Db } from "@/lib/supabase/server";
import { PRACTICE_MODES, keysOf, type FileKind, type PracticeMode } from "@/lib/constants";
import type { StudyFile, TopicContent } from "@/lib/types";
import { PRACTICE_SIZE } from "./logic";
import { ExerciseTypeInput, PracticeItemInput, insertPractice, loadExerciseType, practiceHistory, upsertExerciseTypes } from "./practice";

/** Material de un tema para Gemini: título, contenidos y sus PDF del tipo indicado (por defecto, teoría y otros). */
async function topicMaterial(supabase: Db, topicId: string, kinds: FileKind[] = ["teoria", "otro"]) {
  const { data: topic } = await supabase.from("topics").select("id, title, subject_id, subjects(name)").eq("id", topicId).single();
  if (!topic) throw new Error("Tema no encontrado");
  const [{ data: contents }, { data: files }] = await Promise.all([
    supabase.from("topic_contents").select("title").eq("topic_id", topicId).order("position"),
    supabase.from("study_files").select("storage_path, mime_type, kind").eq("topic_id", topicId).in("kind", kinds),
  ]);
  const subject = (topic.subjects as unknown as { name: string } | null)?.name ?? "";
  const pdfs = await fileParts(supabase, (files ?? []) as Pick<StudyFile, "storage_path" | "mime_type">[]);
  const intro: AiPart = {
    text: [
      `Asignatura: ${subject}`,
      `Tema: ${topic.title}`,
      (contents as Pick<TopicContent, "title">[] | null)?.length
        ? `Contenidos que hay que estudiar:\n${(contents ?? []).map((c) => `- ${c.title}`).join("\n")}`
        : "",
      pdfs.length
        ? `Te adjunto ${kinds.includes("boletin") ? "los apuntes y el boletín de ejercicios" : "los apuntes"} del tema.`
        : "No hay archivos adjuntos: usa lo que sepas del tema a nivel de 1º de carrera.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
  return { topic, parts: [intro, ...pdfs] };
}

/** Resumen del tema con Gemini (se guarda en el tema). */
export async function summarizeTopic(topicId: string) {
  return mutate(async ({ supabase }) => {
    const { parts } = await topicMaterial(supabase, topicId);
    const summary = await generateText(
      `${SYSTEM_BASE} Haz un resumen para estudiar el tema: ideas clave en viñetas, definiciones importantes y lo que suele caer en examen. Máximo 350 palabras. Sin introducciones.`,
      parts,
    );
    if (!summary) return invalid("Gemini no ha devuelto nada, prueba otra vez");
    return supabase.from("topics").update({ summary, summary_at: new Date().toISOString() }).eq("id", topicId);
  });
}

const CardsSchema = z.object({
  cards: z.array(z.object({ front: z.string().min(3), back: z.string().min(1) })).min(1).max(15),
});

/** Crea flashcards del tema con Gemini y las añade a la baraja de la asignatura. */
export async function generateTopicFlashcards(topicId: string) {
  return mutate(async ({ supabase }) => {
    const { topic, parts } = await topicMaterial(supabase, topicId);
    const { cards } = await generateJson(
      `${SYSTEM_BASE} Crea entre 8 y 12 flashcards tipo examen para repasar el tema. Pregunta concreta en "front", respuesta breve y correcta en "back". Nada de preguntas triviales.`,
      parts,
      CardsSchema,
    );
    const empty = createEmptyCard();
    return supabase.from("flashcards").insert(
      cards.map((c) => ({ subject_id: topic.subject_id, topic_id: topicId, front: c.front, back: c.back, fsrs: empty, due: empty.due.toISOString() })),
    );
  });
}

// ─── Práctica por tipos de ejercicio (reserva de Claude) ────────────
const TypesSchema = z.object({ tipos: z.array(ExerciseTypeInput).min(1).max(12) });
const PracticeSchema = z.object({ ejercicios: z.array(PracticeItemInput).min(3).max(8) });
const MATH = "Usa Markdown y escribe las fórmulas en LaTeX ($…$ en línea, $$…$$ aparte).";

/** Lee los boletines del tema y guarda los tipos de ejercicio que hay. */
export async function detectExerciseTypes(topicId: string) {
  return mutate(async ({ supabase }) => {
    const { parts } = await topicMaterial(supabase, topicId, ["boletin"]);
    if (parts.length < 2) return invalid("Sube primero el boletín de ejercicios del tema (en PDF o foto)");
    const { tipos } = await generateJson(
      `${SYSTEM_BASE} Lee el boletín y agrupa sus ejercicios por tipo: los que se resuelven con el mismo método. Para cada tipo: nombre corto, qué piden y cómo reconocerlos, cuántos hay y cuáles son (sus números).`,
      parts,
      TypesSchema,
    );
    await upsertExerciseTypes(supabase, topicId, tipos);
  });
}

/** Guía de un tipo: teoría mínima, pasos y un ejemplo resuelto. */
export async function generateGuide(typeId: string) {
  return mutate(async ({ supabase }) => {
    const loaded = await loadExerciseType(supabase, typeId);
    if (!loaded) return invalid("Tipo de ejercicio no encontrado");
    const { type, topic } = loaded;
    const { parts } = await topicMaterial(supabase, topic.id, ["teoria", "boletin", "otro"]);
    const guide = await generateText(
      `${SYSTEM_BASE} Explica cómo resolver los ejercicios de tipo «${type.name}»${type.description ? ` (${type.description})` : ""}. ` +
        `Estructura: "## Teoría" (solo lo necesario), "## Pasos" (lista numerada) y "## Ejemplo resuelto" (uno parecido a los del boletín, resuelto paso a paso). ${MATH} Sin introducciones.`,
      parts,
    );
    if (!guide) return invalid("Gemini no ha devuelto nada, prueba otra vez");
    return supabase.from("exercise_types").update({ guide, guide_at: new Date().toISOString() }).eq("id", typeId);
  });
}

/** Tanda nueva de un tipo, centrada en lo fallado antes. Al acabar, abre la tanda. */
export async function generatePractice(typeId: string, mode: PracticeMode) {
  if (!keysOf(PRACTICE_MODES).includes(mode)) return { error: "Modalidad no válida" };
  let setId = "";
  const result = await mutate(async ({ supabase }) => {
    const loaded = await loadExerciseType(supabase, typeId);
    if (!loaded) return invalid("Tipo de ejercicio no encontrado");
    const { type, topic } = loaded;
    const history = await practiceHistory(supabase, typeId);
    const failed = history.flatMap((h) => h.falladas.map((f) => f.enunciado)).slice(-8);
    const context = [
      `Asignatura: ${topic.subjectName}`,
      `Tema: ${topic.title}`,
      `Tipo de ejercicio: ${type.name}${type.description ? ` — ${type.description}` : ""}`,
      type.guide ? `Guía que he estudiado:\n${type.guide}` : "",
      failed.length ? `Ejercicios que he fallado antes (céntrate en eso, sin repetirlos):\n${failed.map((f) => `- ${f}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const { ejercicios } = await generateJson(
      `${SYSTEM_BASE} Crea ${PRACTICE_SIZE} ejercicios ${mode === "test" ? "tipo test (4 opciones, una correcta; indica su índice desde 0 en «correcta»)" : "de desarrollo (con el resultado final en «resultado»)"} ` +
        `de este tipo, de dificultad creciente y del nivel de un examen. Cada uno con una pista que no dé la solución y la solución paso a paso. ${MATH}`,
      [{ text: context }],
      PracticeSchema,
    );
    setId = await insertPractice(supabase, typeId, mode, ejercicios);
  });
  if (result?.error) return result;
  redirect(`/estudios/practica/${setId}`);
}
