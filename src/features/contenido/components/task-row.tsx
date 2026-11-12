import Link from "next/link";
import { Dot, Row } from "@/components/ui/primitives";
import { VIDEO_FORMATS } from "@/lib/constants";
import { formatTime } from "@/lib/dates";
import type { VideoTaskItem } from "../queries";

/** Tarea de un vídeo en un día (grabar, editar o publicar). Se usa en Calendario y en Hoy. */
export function TaskRow({ item, prefix }: { item: VideoTaskItem; prefix?: string }) {
  const { video, task } = item;
  const time = task.key === "publish_date" && video.publish_time ? ` a las ${formatTime(video.publish_time)}` : "";
  return (
    <Link href={`/contenido/video/${video.id}`} className="block">
      <Row
        leading={<Dot tone={task.tone} />}
        title={`${task.label} · ${video.title}`}
        subtitle={`${prefix ? `${prefix} · ` : ""}${VIDEO_FORMATS[video.format].label}${time}`}
      />
    </Link>
  );
}
