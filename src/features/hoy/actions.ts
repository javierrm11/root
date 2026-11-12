"use server";

import { invalid, mutate } from "@/lib/actions";
import { AGENDA_CATEGORIES, INBOX_KINDS, keysOf } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { oneOf, optText, text } from "@/lib/form";

// ─── Agenda ─────────────────────────────────────────────────────────
export async function createAgendaItem(fd: FormData) {
  return mutate(({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Ponle un título");
    return supabase.from("agenda_items").insert({
      title,
      day: text(fd, "day") || todayISO(),
      start_time: optText(fd, "start_time"),
      end_time: optText(fd, "end_time"),
      category: oneOf(fd, "category", keysOf(AGENDA_CATEGORIES), "personal"),
      notes: optText(fd, "notes"),
    });
  });
}

// ─── Hábitos ────────────────────────────────────────────────────────
export async function createHabit(fd: FormData) {
  return mutate(({ supabase }) => {
    const name = text(fd, "name");
    if (!name) return invalid("Ponle un nombre");
    return supabase.from("habits").insert({ name });
  });
}

export async function toggleHabit(habitId: string, day: string, done: boolean) {
  return mutate(({ supabase }) =>
    done
      ? supabase.from("habit_logs").insert({ habit_id: habitId, day })
      : supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("day", day),
  );
}

// ─── Bandeja de entrada (captura rápida) ────────────────────────────
export async function createInboxItem(fd: FormData) {
  return mutate(({ supabase }) => {
    const content = text(fd, "content");
    if (!content) return invalid("Escribe algo");
    return supabase.from("inbox_items").insert({ content, kind: oneOf(fd, "kind", keysOf(INBOX_KINDS), "nota") });
  });
}

export async function processInboxItem(id: string) {
  return mutate(({ supabase }) =>
    supabase.from("inbox_items").update({ processed_at: new Date().toISOString() }).eq("id", id),
  );
}
