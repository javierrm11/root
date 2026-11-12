import Link from "next/link";
import { getContentToday } from "../queries";

/** Aviso en la cabecera de Contenido: lo que toca hoy. */
export async function ContentTodayChip() {
  const { today } = await getContentToday();
  const first = today[0];
  if (!first) return null;
  return (
    <Link href={`/contenido/video/${first.video.id}`} className={`chip tone-${first.task.tone} h-9 text-[13px]`}>
      Hoy: {first.task.label.toLowerCase()}
      {today.length > 1 && ` +${today.length - 1}`}
    </Link>
  );
}
