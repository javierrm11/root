"use server";

import { redirect } from "next/navigation";
import { invalid, mutate, upsert } from "@/lib/actions";
import { VIDEO_FORMATS, VIDEO_STAGES, keysOf, type VideoStage } from "@/lib/constants";
import { oneOf, optInt, optText, text } from "@/lib/form";

const FORMATS = keysOf(VIDEO_FORMATS);

// ─── Ideas de vídeo ─────────────────────────────────────────────────
export async function saveContentIdea(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe la idea");
    return upsert(supabase, "content_ideas", id, {
      title,
      hook: optText(fd, "hook"),
      format: oneOf(fd, "format", FORMATS, "tutorial"),
      hashtags: optText(fd, "hashtags"),
      notes: optText(fd, "notes"),
    });
  });
}

/** Pasa una idea al pipeline: crea el vídeo en fase Guion con su gancho y formato. */
export async function ideaToVideo(id: string) {
  let videoId: string | null = null;
  const result = await mutate(async ({ supabase }) => {
    const { data: idea, error } = await supabase.from("content_ideas").select("*").eq("id", id).single();
    if (error) return { error };
    const { data, error: insertError } = await supabase
      .from("videos")
      .insert({ idea_id: id, title: idea.title, hook: idea.hook, format: idea.format, hashtags: idea.hashtags, notes: idea.notes })
      .select("id")
      .single();
    if (insertError) return { error: insertError };
    videoId = data.id;
  });
  if (result?.error || !videoId) return result;
  redirect(`/contenido/video/${videoId}`);
}

// ─── Vídeos ─────────────────────────────────────────────────────────
export async function saveVideo(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Ponle un título al vídeo");
    return upsert(supabase, "videos", id, {
      title,
      format: oneOf(fd, "format", FORMATS, "tutorial"),
      stage: oneOf(fd, "stage", keysOf(VIDEO_STAGES), "guion"),
      series: optText(fd, "series"),
      record_date: optText(fd, "record_date"),
      edit_date: optText(fd, "edit_date"),
      publish_date: optText(fd, "publish_date"),
      publish_time: optText(fd, "publish_time"),
      duration_s: optInt(fd, "duration_s"),
      sound: optText(fd, "sound"),
      hashtags: optText(fd, "hashtags"),
      hook: optText(fd, "hook"),
      body: optText(fd, "body"),
      cta: optText(fd, "cta"),
      notes: optText(fd, "notes"),
    });
  });
}

export async function setVideoStage(id: string, stage: VideoStage) {
  return mutate(({ supabase }) => supabase.from("videos").update({ stage }).eq("id", id));
}

export async function deleteVideo(id: string) {
  const result = await mutate(({ supabase }) => supabase.from("videos").delete().eq("id", id));
  if (result?.error) return result;
  redirect("/contenido/pipeline");
}

// ─── Ventanas de publicación (las rellena Claude por MCP o se añaden a mano) ────
type WindowInput = { weekday: number; start_time: string; end_time: string; note?: string | null };

/** Guarda las ventanas recomendadas; por defecto sustituye las anteriores. */
export async function replaceWindows(windows: WindowInput[], replace = true) {
  return mutate(async ({ supabase }) => {
    const valid = windows.filter((w) => w.weekday >= 0 && w.weekday <= 6 && w.end_time > w.start_time);
    if (!valid.length) return invalid("Ninguna ventana válida");
    if (replace) {
      const { error } = await supabase.from("publish_windows").delete().gte("weekday", 0);
      if (error) return { error };
    }
    return supabase.from("publish_windows").insert(valid.map((w) => ({ ...w, note: w.note ?? null })));
  });
}

export async function saveWindow(fd: FormData) {
  return mutate(({ supabase }) => {
    const weekday = optInt(fd, "weekday");
    const start = text(fd, "start_time");
    const end = text(fd, "end_time");
    if (weekday === null || weekday < 0 || weekday > 6 || !start || !end || end <= start) return invalid("Elige día y una franja válida");
    return supabase.from("publish_windows").insert({ weekday, start_time: start, end_time: end, note: optText(fd, "note") });
  });
}
