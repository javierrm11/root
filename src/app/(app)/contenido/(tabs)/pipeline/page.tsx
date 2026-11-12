import Link from "next/link";
import { Suspense } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, LinkPills, Row, RowList, Skeleton } from "@/components/ui/primitives";
import { VIDEO_FORMATS, VIDEO_STAGES, type VideoStage } from "@/lib/constants";
import { formatShortDay } from "@/lib/dates";
import { saveVideo } from "@/features/contenido/actions";
import { VideoFields } from "@/features/contenido/components/fields";
import { STAGE_ORDER, nextTask } from "@/features/contenido/logic";
import { getPipeline } from "@/features/contenido/queries";

export const metadata = { title: "Pipeline" };

type SearchParams = Promise<{ fase?: string }>;

export default function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Pipeline searchParams={searchParams} />
    </Suspense>
  );
}

async function Pipeline({ searchParams }: { searchParams: SearchParams }) {
  const { fase } = await searchParams;
  const videos = await getPipeline();
  const count = (stage: VideoStage) => videos.filter((v) => v.stage === stage).length;
  // Por defecto, la primera fase con trabajo pendiente.
  const fallback = STAGE_ORDER.find((s) => s !== "publicado" && count(s) > 0) ?? "guion";
  const stage = STAGE_ORDER.includes(fase as VideoStage) ? (fase as VideoStage) : fallback;
  const list = videos.filter((v) => v.stage === stage);

  return (
    <>
      <LinkPills items={STAGE_ORDER.map((s) => ({ href: `?fase=${s}`, label: VIDEO_STAGES[s].label, active: s === stage, count: count(s) }))} />

      {list.length ? (
        <RowList>
          {list.map((video) => {
            const task = nextTask(video);
            return (
              <Link key={video.id} href={`/contenido/video/${video.id}`} className="block">
                <Row
                  title={video.title}
                  subtitle={[VIDEO_FORMATS[video.format].label, video.series].filter(Boolean).join(" · ")}
                  trailing={
                    <Chip tone={task.date ? task.tone : "mut"}>
                      {task.date ? `${video.stage === "publicado" ? "Publicado" : task.label} ${formatShortDay(task.date)}` : "Sin fecha"}
                    </Chip>
                  }
                />
              </Link>
            );
          })}
        </RowList>
      ) : (
        <p className="py-2 text-sm text-muted">Nada en esta fase.</p>
      )}

      <FormSheet title="Nuevo vídeo" trigger={{ label: "Nuevo vídeo", icon: "plus", variant: "drop" }} action={saveVideo.bind(null, null)} submitLabel="Crear">
        <VideoFields />
      </FormSheet>
    </>
  );
}
