"use server";

import { createEmptyCard } from "ts-fsrs";
import { z } from "zod";
import { SYSTEM_BASE, fileParts, generateJson, generateText, type AiPart } from "@/lib/ai";
import { invalid, mutate } from "@/lib/actions";
import type { Db } from "@/lib/supabase/server";
import type { FileKind } from "@/lib/constants";
import type { StudyFile, TopicContent } from "@/lib/types";
import { ExerciseTypeInput, upsertExerciseTypes } from "./practice";

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

// ─── Tipos de ejercicio (reserva de Claude) ─────────────────────────
const TypesSchema = z.object({ tipos: z.array(ExerciseTypeInput).min(1).max(12) });

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
