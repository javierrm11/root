import "server-only";
import { z } from "zod";
import type { PracticeMode } from "@/lib/constants";
import type { Db } from "@/lib/supabase/server";
import type { ExerciseType, PracticeItem, PracticeSet } from "@/lib/types";

// Lo común a Claude (MCP) y Gemini para el método de estudio por tipos de ejercicio.
// Los esquemas usan nombres en español porque son los que ve Claude.

export const ExerciseTypeInput = z.object({
  nombre: z.string().min(1).max(160).describe("Nombre corto del tipo, p. ej. «Árbol de recubrimiento mínimo con Kruskal»"),
  descripcion: z.string().optional().describe("Qué piden estos ejercicios y cómo reconocerlos"),
  cantidad: z.number().int().min(0).optional().describe("Cuántos ejercicios del boletín son de este tipo"),
  ejercicios: z.string().optional().describe("Cuáles son, p. ej. «1, 4 y 7»"),
});

export const PracticeItemInput = z.object({
  enunciado: z.string().min(1).describe("Markdown; fórmulas en LaTeX con $…$"),
  opciones: z.array(z.string().min(1)).min(2).max(6).optional().describe("Solo en test: las opciones, sin letras delante"),
  correcta: z.number().int().min(0).optional().describe("Solo en test: índice (desde 0) de la opción correcta"),
  resultado: z.string().optional().describe("Solo en desarrollo: el resultado final, para comprobarlo rápido"),
  pista: z.string().optional().describe("Una pista que ayude sin dar la solución"),
  solucion: z.string().min(1).describe("Solución paso a paso en Markdown"),
});

export type ExerciseTypeInput = z.infer<typeof ExerciseTypeInput>;
export type PracticeItemInput = z.infer<typeof PracticeItemInput>;

const fail = (message: string): never => {
  throw new Error(message);
};

/** Añade los tipos de un tema; si ya hay uno con el mismo nombre, lo actualiza. */
export async function upsertExerciseTypes(supabase: Db, topicId: string, tipos: ExerciseTypeInput[]) {
  const { data: existing } = await supabase.from("exercise_types").select("id, name").eq("topic_id", topicId);
  const byName = new Map((existing ?? []).map((t) => [t.name.trim().toLowerCase(), t.id as string]));
  let position = existing?.length ?? 0;
  const saved: Array<{ id: string; nombre: string }> = [];
  for (const t of tipos) {
    const fields = {
      name: t.nombre.trim(),
      description: t.descripcion ?? null,
      count: t.cantidad ?? null,
      examples: t.ejercicios ?? null,
    };
    const id = byName.get(fields.name.toLowerCase());
    const { data, error } = id
      ? await supabase.from("exercise_types").update(fields).eq("id", id).select("id").single()
      : await supabase.from("exercise_types").insert({ ...fields, topic_id: topicId, position: position++ }).select("id").single();
    if (error) fail(error.message);
    saved.push({ id: data!.id, nombre: fields.name });
  }
  return saved;
}

/** Crea una tanda con sus ejercicios y pone el tipo en "practicando" si estaba pendiente. Devuelve su id. */
export async function insertPractice(supabase: Db, typeId: string, mode: PracticeMode, items: PracticeItemInput[]) {
  if (!items.length) fail("La tanda no tiene ejercicios");
  if (mode === "test") {
    items.forEach((item, i) => {
      if (!item.opciones || item.correcta === undefined || item.correcta >= item.opciones.length)
        fail(`El ejercicio ${i + 1} es de test: necesita opciones y el índice de la correcta`);
    });
  }
  const { data: set, error } = await supabase.from("practice_sets").insert({ exercise_type_id: typeId, mode }).select("id").single();
  if (error) fail(error.message);
  const { error: itemsError } = await supabase.from("practice_items").insert(
    items.map((item, position) => ({
      set_id: set!.id,
      position,
      question: item.enunciado,
      options: mode === "test" ? item.opciones : null,
      correct_option: mode === "test" ? item.correcta : null,
      answer: mode === "desarrollo" ? (item.resultado ?? null) : null,
      hint: item.pista ?? null,
      solution: item.solucion,
    })),
  );
  if (itemsError) {
    await supabase.from("practice_sets").delete().eq("id", set!.id);
    fail(itemsError.message);
  }
  await supabase.from("exercise_types").update({ status: "practicando" }).eq("id", typeId).eq("status", "pendiente");
  return set!.id as string;
}

/** Tipo de ejercicio con su tema y asignatura (para los prompts y las cabeceras). */
export async function loadExerciseType(supabase: Db, typeId: string) {
  const { data } = await supabase
    .from("exercise_types")
    .select("*, topics(id, title, subject_id, subjects(name))")
    .eq("id", typeId)
    .maybeSingle();
  if (!data) return null;
  const topic = data.topics as unknown as { id: string; title: string; subject_id: string; subjects: { name: string } | null };
  return { type: data as ExerciseType, topic: { id: topic.id, title: topic.title, subjectId: topic.subject_id, subjectName: topic.subjects?.name ?? "" } };
}

/** Historial de tandas de un tipo, con lo fallado, para preparar la siguiente. */
export async function practiceHistory(supabase: Db, typeId: string) {
  const { data: sets } = await supabase.from("practice_sets").select("*").eq("exercise_type_id", typeId).order("created_at");
  const list = (sets ?? []) as PracticeSet[];
  const { data: items } = list.length
    ? await supabase.from("practice_items").select("*").in("set_id", list.map((s) => s.id)).order("position")
    : { data: [] };
  const rows = (items ?? []) as PracticeItem[];
  return list.map((s) => {
    const own = rows.filter((i) => i.set_id === s.id);
    return {
      fecha: s.created_at.slice(0, 10),
      modalidad: s.mode,
      terminada: Boolean(s.finished_at),
      aciertos: own.filter((i) => i.correct).length,
      total: own.length,
      falladas: own
        .filter((i) => i.correct === false)
        .map((i) => ({
          enunciado: i.question,
          ...(i.options && { marcada: i.chosen_option !== null ? i.options[i.chosen_option] : null, correcta: i.options[i.correct_option ?? 0] }),
        })),
      sin_responder: own.filter((i) => i.correct === null).length,
    };
  });
}
