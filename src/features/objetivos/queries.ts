import "server-only";
import { sum } from "@/lib/collections";
import { GOAL_METRICS, type GoalMetric } from "@/lib/constants";
import { daysBetween, todayISO } from "@/lib/dates";
import { must, requireUser } from "@/lib/supabase/server";
import type { Goal } from "@/lib/types";
import { masteryPct } from "@/features/estudios/logic";
import { exerciseRecord, getExercises } from "@/features/gym/queries";

/** Unidad con la que se muestra el valor de cada tipo de objetivo. */
export const GOAL_UNITS: Record<GoalMetric, string> = {
  manual: "",
  subject_mastery: "%",
  exercise_record: "kg",
  videos_published: "vídeos",
  new_clients: "clientes",
  freelance_hours: "h",
};

/** Objetivos con su valor actual calculado desde el módulo al que están conectados. */
export async function getGoals() {
  const { supabase } = await requireUser();
  const today = todayISO();
  const [goals, subjects, exercises] = await Promise.all([
    supabase.from("goals").select("*").order("end_date").order("created_at").then(must<Goal[]>),
    supabase.from("subjects").select("id, name").order("name").then(must<Array<{ id: string; name: string }>>),
    getExercises(),
  ]);

  const current = async (goal: Goal): Promise<number> => {
    const end = `${goal.end_date}T23:59:59`;
    switch (goal.metric) {
      case "subject_mastery": {
        const { data } = await supabase.from("topics").select("mastery").eq("subject_id", goal.ref_id ?? "");
        return masteryPct((data ?? []).map((t) => t.mastery));
      }
      case "exercise_record":
        return goal.ref_id ? exerciseRecord(goal.ref_id) : 0;
      case "videos_published": {
        const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).eq("stage", "publicado").gte("publish_date", goal.start_date).lte("publish_date", goal.end_date);
        return count ?? 0;
      }
      case "new_clients": {
        const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", goal.start_date).lte("created_at", end);
        return count ?? 0;
      }
      case "freelance_hours": {
        const { data } = await supabase.from("time_entries").select("hours").gte("day", goal.start_date).lte("day", goal.end_date);
        return sum(data ?? [], (e) => e.hours);
      }
      default:
        return Number(goal.manual_value);
    }
  };

  const refName = (goal: Goal) =>
    subjects.find((s) => s.id === goal.ref_id)?.name ?? exercises.find((e) => e.id === goal.ref_id)?.name ?? null;

  const withValues = await Promise.all(
    goals.map(async (goal) => {
      const value = await current(goal);
      return {
        ...goal,
        value,
        pct: Math.min(100, Math.round((value / Number(goal.target)) * 100)),
        unit: GOAL_UNITS[goal.metric],
        source: [GOAL_METRICS[goal.metric].label, refName(goal)].filter(Boolean).join(" · "),
        daysLeft: daysBetween(today, goal.end_date),
      };
    }),
  );

  return {
    today,
    goals: withValues,
    subjects,
    exercises,
    average: withValues.length ? Math.round(sum(withValues, (g) => g.pct) / withValues.length) : 0,
  };
}

export type GoalWithValue = Awaited<ReturnType<typeof getGoals>>["goals"][number];
