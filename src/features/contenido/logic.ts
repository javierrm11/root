// Reglas del módulo de contenido, puras.
import { VIDEO_STAGES, VIDEO_TASKS, keysOf, type VideoStage, type VideoTask } from "@/lib/constants";
import type { Video } from "@/lib/types";

export const STAGE_ORDER = keysOf(VIDEO_STAGES);

/** Fase siguiente del pipeline (null si ya está publicado). */
export function nextStage(stage: VideoStage): VideoStage | null {
  return STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1] ?? null;
}

/** Qué fecha importa en cada fase: la próxima tarea del vídeo. */
const TASK_BY_STAGE: Record<VideoStage, VideoTask> = {
  guion: "record_date",
  grabar: "record_date",
  editar: "edit_date",
  programado: "publish_date",
  publicado: "publish_date",
};

export function nextTask(video: Video) {
  const task = VIDEO_TASKS.find((t) => t.key === TASK_BY_STAGE[video.stage])!;
  return { ...task, date: video[task.key] };
}

/** Tareas (grabar, editar, publicar) de una lista de vídeos que caen en un día. */
export function tasksOn(videos: Video[], day: string) {
  return videos.flatMap((video) => VIDEO_TASKS.filter((t) => video[t.key] === day).map((task) => ({ video, task })));
}
