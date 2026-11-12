import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Chip, Row, RowList, Section, Skeleton, Stat, StatRow, Steps } from "@/components/ui/primitives";
import { VIDEO_FORMATS, VIDEO_STAGES, VIDEO_TASKS } from "@/lib/constants";
import { formatShortDay, formatTime } from "@/lib/dates";
import { deleteVideo, saveVideo, setVideoStage } from "@/features/contenido/actions";
import { VideoFields } from "@/features/contenido/components/fields";
import { STAGE_ORDER, nextStage } from "@/features/contenido/logic";
import { getVideo } from "@/features/contenido/queries";

type Params = Promise<{ id: string }>;

export default function VideoPage({ params }: { params: Params }) {
  return (
    <>
      <Link href="/contenido/pipeline" className="-ml-1 mb-2 inline-flex h-11 items-center gap-0.5 text-[15px] font-semibold text-acc">
        <Icon name="chevron-left" size={22} />
        Pipeline
      </Link>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Video params={params} />
      </Suspense>
    </>
  );
}

async function Video({ params }: { params: Params }) {
  const { id } = await params;
  const video = await getVideo(id);
  const next = nextStage(video.stage);
  const script = [
    ["Gancho · 0–3 s", video.hook],
    ["Desarrollo", video.body],
    ["Llamada a la acción", video.cta],
  ] as const;
  const details = [
    ["Duración", video.duration_s ? `${video.duration_s} s` : null],
    ["Hora", video.publish_time ? formatTime(video.publish_time) : null],
    ["Sonido", video.sound],
    ["Hashtags", video.hashtags],
    ["Notas", video.notes],
  ].filter((d): d is [string, string] => Boolean(d[1]));

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em]">{video.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="content">{VIDEO_FORMATS[video.format].label}</Chip>
            {video.series && <Chip tone="study">{video.series}</Chip>}
          </div>
        </div>
        <FormSheet title="Editar vídeo" trigger={{ label: "Editar vídeo", icon: "pencil", variant: "icon" }} action={saveVideo.bind(null, video.id)}>
          <VideoFields video={video} />
        </FormSheet>
      </div>

      <div className="my-5">
        <Steps steps={STAGE_ORDER.map((s) => VIDEO_STAGES[s].label)} current={STAGE_ORDER.indexOf(video.stage)} />
      </div>

      <StatRow>
        {VIDEO_TASKS.map((task) => {
          const date = video[task.key];
          return <Stat key={task.key} value={date ? formatShortDay(date) : "—"} label={task.label} />;
        })}
      </StatRow>

      <Section title="Guion">
        <div className="divide-y divide-line">
          {script.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 py-3">
              <span className="section-title text-acc">{label}</span>
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{value || <span className="text-muted">Sin escribir todavía</span>}</p>
            </div>
          ))}
        </div>
      </Section>

      {details.length > 0 && (
        <Section title="Detalles">
          <RowList>
            {details.map(([label, value]) => (
              <Row key={label} leading={<span className="w-20 shrink-0 text-[13px] text-muted">{label}</span>} title={value} />
            ))}
          </RowList>
        </Section>
      )}

      {next && (
        <ActionButton action={setVideoStage.bind(null, video.id, next)} className="mt-4 h-11 w-full rounded-xl bg-accent font-semibold text-ink">
          Pasar a {VIDEO_STAGES[next].label.toLowerCase()}
        </ActionButton>
      )}

      <div className="mt-6 flex justify-center">
        <ActionButton action={deleteVideo.bind(null, video.id)} confirm={`¿Borrar «${video.title}»?`} className="min-h-11 text-[13px] font-semibold text-muted">
          Borrar vídeo
        </ActionButton>
      </div>
    </>
  );
}
