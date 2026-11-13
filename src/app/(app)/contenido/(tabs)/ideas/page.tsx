import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, EmptyState, Skeleton } from "@/components/ui/primitives";
import { VIDEO_FORMATS } from "@/lib/constants";
import { deleteRow } from "@/features/common/actions";
import { ideaToVideo, saveContentIdea } from "@/features/contenido/actions";
import { ContentIdeaFields } from "@/features/contenido/components/fields";
import { getContentIdeas } from "@/features/contenido/queries";

export const metadata = { title: "Ideas de vídeo" };

export default function ContentIdeasPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Ideas />
    </Suspense>
  );
}

async function Ideas() {
  const ideas = await getContentIdeas();

  return (
    <>
      {!ideas.length && (
        <EmptyState icon="sparkles" title="Sin ideas de vídeo">
          Apunta aquí cada idea con su gancho. Cuando la vayas a hacer, pásala a guion.
        </EmptyState>
      )}

      <div className="list-grid">
        {ideas.map((idea) => (
          <div key={idea.id} className="flex flex-col gap-2 py-4">
            <p className="text-[15px] font-semibold">{idea.title}</p>
            {idea.hook && <p className="text-[13px] italic">«{idea.hook}»</p>}
            <div className="flex flex-wrap gap-1.5">
              <Chip tone="content">{VIDEO_FORMATS[idea.format].label}</Chip>
              {idea.hashtags && <Chip tone="mut">{idea.hashtags}</Chip>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
              {idea.video ? (
                <Link href={`/contenido/video/${idea.video.id}`} className="chip tone-gym">
                  En el pipeline
                </Link>
              ) : (
                <ActionButton action={ideaToVideo.bind(null, idea.id)} className="h-9 rounded-xl bg-accent px-3.5 text-sm font-semibold text-ink">
                  Pasar a guion
                </ActionButton>
              )}
              <FormSheet title="Editar idea" trigger={{ label: "Editar" }} action={saveContentIdea.bind(null, idea.id)}>
                <ContentIdeaFields idea={idea} />
              </FormSheet>
              <ActionButton action={deleteRow.bind(null, "content_ideas", idea.id)} confirm={`¿Borrar «${idea.title}»?`} className="min-h-8 text-[13px] font-semibold text-muted">
                Borrar
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      <FormSheet title="Nueva idea" trigger={{ label: "Nueva idea", icon: "plus", variant: "drop" }} action={saveContentIdea.bind(null, null)} submitLabel="Guardar">
        <ContentIdeaFields />
      </FormSheet>
    </>
  );
}
