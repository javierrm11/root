"use server";

import { z } from "zod";
import { SYSTEM_BASE, generateJson } from "@/lib/ai";
import { invalid, mutate } from "@/lib/actions";
import { AGENDA_CATEGORIES, keysOf } from "@/lib/constants";
import { addDays, todayISO } from "@/lib/dates";
import type { WeeklyReview } from "@/lib/types";
import { getPriorityTopics } from "@/features/estudios/queries";
import { getGoals } from "@/features/objetivos/queries";
import { reviewWeek, weekStats } from "./queries";

const ReviewSchema = z.object({
  summary: z.string(),
  good: z.array(z.string()).max(4),
  improve: z.array(z.string()).max(4),
  plan: z
    .array(z.object({ title: z.string(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.enum(keysOf(AGENDA_CATEGORIES)) }))
    .max(8),
});

/** Genera con Gemini el resumen de la semana y el plan de la siguiente. */
export async function generateReview() {
  return mutate(async ({ supabase }) => {
    const today = todayISO();
    const start = reviewWeek(today);
    const nextMonday = addDays(start, 7);
    const [stats, priority, goals, exams, invoices, videos] = await Promise.all([
      weekStats(supabase, start, today),
      getPriorityTopics(5),
      getGoals(),
      supabase.from("exams").select("exam_date, kind, subjects(name)").gte("exam_date", today).lte("exam_date", addDays(today, 30)).order("exam_date"),
      supabase.from("invoices").select("number, amount, due_date, status").neq("status", "cobrada"),
      supabase.from("videos").select("title, stage, record_date, publish_date").neq("stage", "publicado"),
    ]);

    const context = {
      semana: { desde: start, hasta: addDays(start, 6) },
      numeros: stats,
      temas_prioritarios: priority.map((t) => ({ tema: t.title, asignatura: t.subjectName, dominio: t.mastery, dias_examen: t.examDays })),
      examenes_proximos: exams.data ?? [],
      objetivos: goals.goals.map((g) => ({ objetivo: g.title, progreso_pct: g.pct, fin: g.end_date })),
      facturas_pendientes: invoices.data ?? [],
      videos_en_marcha: videos.data ?? [],
    };

    const review = await generateJson(
      `${SYSTEM_BASE} Haz la revisión semanal. "summary": 2-3 frases directas sobre cómo fue la semana. "good" y "improve": hasta 3 puntos concretos cada uno, basados en los datos. "plan": de 4 a 6 tareas para la semana del ${nextMonday} al ${addDays(nextMonday, 6)}, cada una con un día de esa semana (YYYY-MM-DD) y su categoría; prioriza exámenes cercanos y temas con poco dominio.`,
      [{ text: JSON.stringify(context) }],
      ReviewSchema,
    );

    return supabase.from("weekly_reviews").upsert(
      { week_start: start, stats, summary: review.summary, good: review.good, improve: review.improve, plan: review.plan.map((p) => ({ ...p, added: false })) },
      { onConflict: "user_id,week_start" },
    );
  });
}

/** Pasa una tarea del plan a la agenda de su día. */
export async function addPlanItem(reviewId: string, index: number) {
  return mutate(async ({ supabase }) => {
    const { data, error } = await supabase.from("weekly_reviews").select("plan").eq("id", reviewId).single();
    if (error) return { error };
    const plan = (data.plan as WeeklyReview["plan"]) ?? [];
    const item = plan[index];
    if (!item || item.added) return invalid("Esa tarea ya está en la agenda");
    const inserted = await supabase.from("agenda_items").insert({ title: item.title, day: item.day, category: item.category });
    if (inserted.error) return inserted;
    plan[index] = { ...item, added: true };
    return supabase.from("weekly_reviews").update({ plan }).eq("id", reviewId);
  });
}
