import "server-only";
import { requireUser, must } from "@/lib/supabase/server";
import { addDays, nowTime, todayISO } from "@/lib/dates";
import type { AgendaItem, Habit, InboxItem } from "@/lib/types";
import { getNextExam, getPriorityTopics } from "@/features/estudios/queries";

/** Racha: días seguidos (hasta hoy o ayer) con al menos un hábito cumplido. */
function streak(days: Set<string>, today: string) {
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

/** Todo lo que muestra la pantalla Hoy. */
export async function getToday() {
  const { supabase } = await requireUser();
  const today = todayISO();
  const [agenda, habits, logs, inbox, nextExam, priority] = await Promise.all([
    supabase.from("agenda_items").select("*").eq("day", today).order("start_time", { nullsFirst: true }).then(must<AgendaItem[]>),
    supabase.from("habits").select("*").eq("archived", false).order("position").order("created_at").then(must<Habit[]>),
    supabase.from("habit_logs").select("habit_id, day").gte("day", addDays(today, -366)).then(must<Array<{ habit_id: string; day: string }>>),
    supabase.from("inbox_items").select("id", { count: "exact", head: true }).is("processed_at", null),
    getNextExam(),
    getPriorityTopics(),
  ]);
  const doneToday = new Set(logs.filter((l) => l.day === today).map((l) => l.habit_id));
  return {
    today,
    now: nowTime(),
    agenda,
    habits: habits.map((h) => ({ ...h, done: doneToday.has(h.id) })),
    streak: streak(new Set(logs.map((l) => l.day)), today),
    inboxCount: inbox.count ?? 0,
    nextExam,
    priority,
  };
}

export async function getHabits() {
  const { supabase } = await requireUser();
  return supabase.from("habits").select("*").eq("archived", false).order("position").order("created_at").then(must<Habit[]>);
}

export async function getInbox() {
  const { supabase } = await requireUser();
  return supabase.from("inbox_items").select("*").is("processed_at", null).order("created_at", { ascending: false }).then(must<InboxItem[]>);
}
