"use server";

import { mutate } from "@/lib/actions";

/** Tablas cuyas filas se pueden borrar sin limpiar nada en Storage. */
const DELETABLE = [
  "topic_contents",
  "exams",
  "flashcards",
  "habits",
  "agenda_items",
  "inbox_items",
  "clients",
  "project_features",
  "time_entries",
  "ideas",
  "invoices",
  "expenses",
  "content_ideas",
  "publish_windows",
  "routines",
  "routine_exercises",
  "workouts",
  "workout_sets",
  "body_metrics",
  "goals",
] as const;
export type DeletableTable = (typeof DELETABLE)[number];

/** Borrado genérico. RLS garantiza que solo se borran filas propias. */
export async function deleteRow(table: DeletableTable, id: string) {
  if (!DELETABLE.includes(table)) return { error: "Tabla no permitida" };
  return mutate(({ supabase }) => supabase.from(table).delete().eq("id", id));
}

/** Alterna una columna booleana de una fila. */
export async function setFlag(table: "topic_contents" | "agenda_items", id: string, done: boolean) {
  return mutate(({ supabase }) => supabase.from(table).update({ done }).eq("id", id));
}
