import "server-only";
import { sum } from "@/lib/collections";
import { addDays, daysBetween, hoursBetween, todayISO, weekStart, weekdayMonday } from "@/lib/dates";
import { must, requireUser, type Db } from "@/lib/supabase/server";
import type { WeeklyReview } from "@/lib/types";

/** Semana que se revisa: la actual, salvo los lunes, que se revisa la que acaba de terminar. */
export function reviewWeek(today: string) {
  return weekdayMonday(today) === 0 ? addDays(weekStart(today), -7) : weekStart(today);
}

export type WeekStats = {
  estudio_h: number;
  entrenos: number;
  videos: number;
  freelance_h: number;
  habitos_pct: number;
  facturas_pendientes: number;
};

/** Números de una semana (lunes a domingo) a partir de los datos de todos los módulos. */
export async function weekStats(supabase: Db, start: string, today: string): Promise<WeekStats> {
  const end = addDays(start, 7);
  const [agenda, workouts, videos, entries, habits, logs, invoices] = await Promise.all([
    supabase.from("agenda_items").select("start_time, end_time").eq("category", "estudio").gte("day", start).lt("day", end),
    supabase.from("workouts").select("id", { count: "exact", head: true }).not("finished_at", "is", null).gte("day", start).lt("day", end),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("stage", "publicado").gte("publish_date", start).lt("publish_date", end),
    supabase.from("time_entries").select("hours").gte("day", start).lt("day", end),
    supabase.from("habits").select("id", { count: "exact", head: true }).eq("archived", false),
    supabase.from("habit_logs").select("day", { count: "exact", head: true }).gte("day", start).lt("day", end),
    supabase.from("invoices").select("id", { count: "exact", head: true }).neq("status", "cobrada"),
  ]);
  const elapsed = Math.min(7, Math.max(1, daysBetween(start, today) + 1));
  const possible = (habits.count ?? 0) * elapsed;
  return {
    estudio_h: Math.round(sum(agenda.data ?? [], (a) => hoursBetween(a.start_time, a.end_time)) * 10) / 10,
    entrenos: workouts.count ?? 0,
    videos: videos.count ?? 0,
    freelance_h: Math.round(sum(entries.data ?? [], (e) => e.hours) * 10) / 10,
    habitos_pct: possible ? Math.round(((logs.count ?? 0) / possible) * 100) : 0,
    facturas_pendientes: invoices.count ?? 0,
  };
}

/** Pantalla de revisión: números de la semana y la revisión guardada (si ya se generó). */
export async function getWeekReview() {
  const { supabase } = await requireUser();
  const today = todayISO();
  const start = reviewWeek(today);
  const [stats, review] = await Promise.all([
    weekStats(supabase, start, today),
    supabase.from("weekly_reviews").select("*").eq("week_start", start).maybeSingle().then(must<WeeklyReview | null>),
  ]);
  return { today, start, end: addDays(start, 6), stats, review };
}
