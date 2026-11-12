import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { DayMark } from "@/components/ui/month-calendar";
import { addDays, addMonths, monthStart, todayISO, weekdayMonday } from "@/lib/dates";
import { must, requireUser } from "@/lib/supabase/server";
import type { ContentIdea, PublishWindow, Video } from "@/lib/types";
import { tasksOn } from "./logic";

/** Vídeos y ventanas de publicación, una vez por petición. */
const loadContent = cache(async () => {
  const { supabase } = await requireUser();
  const today = todayISO();
  const [videos, windows] = await Promise.all([
    supabase.from("videos").select("*").order("publish_date", { nullsFirst: false }).order("created_at").then(must<Video[]>),
    supabase.from("publish_windows").select("*").order("weekday").order("start_time").then(must<PublishWindow[]>),
  ]);
  return { supabase, today, videos, windows };
});

/** Pestaña Calendario: marcas del mes, tareas del día elegido y ventanas recomendadas. */
export async function getContentCalendar(month?: string, day?: string) {
  const { today, videos, windows } = await loadContent();
  const start = monthStart(month && /^\d{4}-\d{2}$/.test(month) ? month : today);
  const end = addMonths(start, 1);
  const selected = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today;
  const windowDays = new Set(windows.map((w) => w.weekday));

  const marks = new Map<string, DayMark>();
  for (let date = start; date < end; date = addDays(date, 1)) {
    const dots = tasksOn(videos, date).map(({ task }) => task.tone);
    const ring = windowDays.has(weekdayMonday(date));
    if (dots.length || ring) marks.set(date, { dots, ring });
  }

  return {
    today,
    month: start,
    selected,
    marks,
    dayTasks: tasksOn(videos, selected),
    selectedIsWindow: windowDays.has(weekdayMonday(selected)),
    windows,
  };
}

/** Pestaña Pipeline: vídeos agrupados por fase. */
export async function getPipeline() {
  const { videos } = await loadContent();
  return videos;
}

export async function getVideo(id: string) {
  const { videos } = await loadContent();
  const video = videos.find((v) => v.id === id);
  if (!video) notFound();
  return video;
}

/** Pestaña Ideas, marcando las que ya están en el pipeline. */
export async function getContentIdeas() {
  const { supabase, videos } = await loadContent();
  const ideas = await supabase.from("content_ideas").select("*").order("created_at", { ascending: false }).then(must<ContentIdea[]>);
  return ideas.map((idea) => ({ ...idea, video: videos.find((v) => v.idea_id === idea.id) ?? null }));
}

/** Lo que toca hoy (y lo que se publica mañana) para Hoy y la cabecera de Contenido. */
export async function getContentToday() {
  const { today, videos } = await loadContent();
  const tomorrow = addDays(today, 1);
  return {
    today: tasksOn(videos, today),
    tomorrow: tasksOn(videos, tomorrow).filter(({ task }) => task.key === "publish_date"),
  };
}

export type VideoTaskItem = ReturnType<typeof tasksOn>[number];
