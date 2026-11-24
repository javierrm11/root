import "server-only";
import { z } from "zod";
import { STUDY_TASK_KINDS, keysOf } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { Db } from "@/lib/supabase/server";
import { rescheduleOverdue } from "./logic";

// Plan de exámenes: lo común a la app y al MCP (Claude crea, consulta y reorganiza el plan).

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha YYYY-MM-DD");

export const StudyTaskInput = z.object({
  dia: day,
  titulo: z.string().min(1).max(200).describe("Qué hacer, concreto: «Ejercicios 7, 9 y 15(b) del gradiente»"),
  tipo: z.enum(keysOf(STUDY_TASK_KINDS)).default("estudiar"),
  asignatura_id: z.string().uuid().optional(),
  tema_id: z.string().uuid().optional(),
  tipo_ejercicio_id: z.string().uuid().optional().describe("Si la tarea es practicar un tipo de ejercicio"),
  notas: z.string().optional(),
});
export type StudyTaskInput = z.infer<typeof StudyTaskInput>;

/** Inserta tareas del plan; con `replaceFrom`, antes borra las pendientes desde ese día (de esas asignaturas). */
export async function insertStudyTasks(supabase: Db, tasks: StudyTaskInput[], replaceFrom?: string) {
  if (replaceFrom) {
    const subjects = [...new Set(tasks.map((t) => t.asignatura_id).filter(Boolean))] as string[];
    let del = supabase.from("study_tasks").delete().eq("done", false).gte("day", replaceFrom);
    if (subjects.length) del = del.in("subject_id", subjects);
    const { error } = await del;
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from("study_tasks").insert(
    tasks.map((t, position) => ({
      day: t.dia,
      title: t.titulo,
      kind: t.tipo,
      subject_id: t.asignatura_id ?? null,
      topic_id: t.tema_id ?? null,
      exercise_type_id: t.tipo_ejercicio_id ?? null,
      notes: t.notas ?? null,
      position,
    })),
  );
  if (error) throw new Error(error.message);
  return tasks.length;
}

/** Mueve las tareas atrasadas a los próximos días (ver `rescheduleOverdue`). Devuelve cuántas. */
export async function rescheduleOverdueTasks(supabase: Db) {
  const today = todayISO();
  const [{ data: overdue }, { data: pending }, { data: exams }] = await Promise.all([
    supabase.from("study_tasks").select("id, subject_id").eq("done", false).lt("day", today).order("day").order("position"),
    supabase.from("study_tasks").select("day").eq("done", false).gte("day", today),
    supabase.from("exams").select("subject_id, exam_date").gte("exam_date", today).order("exam_date"),
  ]);
  if (!overdue?.length) return 0;
  const load = new Map<string, number>();
  (pending ?? []).forEach((t) => load.set(t.day, (load.get(t.day) ?? 0) + 1));
  const examBySubject = new Map<string, string>();
  (exams ?? []).forEach((e) => examBySubject.has(e.subject_id) || examBySubject.set(e.subject_id, e.exam_date));
  const moves = rescheduleOverdue(overdue, load, examBySubject, today);
  for (const move of moves) {
    const { error } = await supabase.from("study_tasks").update({ day: move.day }).eq("id", move.id);
    if (error) throw new Error(error.message);
  }
  return moves.length;
}
