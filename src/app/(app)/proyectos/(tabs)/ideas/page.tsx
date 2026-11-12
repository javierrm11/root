import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { EmptyState, ProgressBar, Skeleton } from "@/components/ui/primitives";
import { IDEA_CRITERIA } from "@/lib/constants";
import { deleteRow } from "@/features/common/actions";
import { convertIdea, saveIdea } from "@/features/proyectos/actions";
import { IdeaFields } from "@/features/proyectos/components/idea-fields";
import { formatScore, strongestCriteria } from "@/features/proyectos/logic";
import { getIdeas } from "@/features/proyectos/queries";

export const metadata = { title: "Ideas" };

export default function IdeasPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Ideas />
    </Suspense>
  );
}

async function Ideas() {
  const ideas = await getIdeas();

  return (
    <>
      <p className="mb-2 text-[13px] text-muted">Ordenadas por nota · 7 criterios ponderados</p>
      {!ideas.length && (
        <EmptyState icon="sparkles" title="Tu banco de ideas está vacío">
          Apunta cada idea de proyecto y puntúala: la mejor sube arriba sola.
        </EmptyState>
      )}

      <div className="border-b border-line">
        {ideas.map((idea, index) => (
          <details key={idea.id} className="group border-t border-line first:border-t-0">
            <summary className="flex min-h-16 items-center gap-3 py-3">
              <span className="w-5 shrink-0 font-mono text-[13px] text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{idea.title}</span>
                <span className="block text-[13px] text-muted">Fuerte en: {strongestCriteria(idea).join(" y ")}</span>
              </span>
              <span className="font-mono text-[22px] leading-none font-bold text-acc">{formatScore(idea.score)}</span>
            </summary>
            <div className="flex flex-col gap-2.5 pb-4">
              {idea.description && <p className="text-sm text-muted">{idea.description}</p>}
              {IDEA_CRITERIA.map((c) => (
                <div key={c.key} className="grid grid-cols-[minmax(0,1fr)_96px_22px] items-center gap-2.5">
                  <span>
                    <span className="block text-sm font-semibold">{c.label}</span>
                    <span className="block text-xs text-muted">{c.weight === 3 ? "Peso alto" : "Peso medio"}</span>
                  </span>
                  <ProgressBar value={idea[c.key] * 10} />
                  <span className="font-mono text-[13px] text-muted">{idea[c.key]}</span>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                {idea.project_id ? (
                  <Link href={`/proyectos/proyecto/${idea.project_id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-acc">
                    Ver proyecto <Icon name="chevron-right" size={14} />
                  </Link>
                ) : (
                  <ActionButton action={convertIdea.bind(null, idea.id)} className="h-9 rounded-xl bg-accent px-3.5 text-sm font-semibold text-ink">
                    Convertir en proyecto
                  </ActionButton>
                )}
                <FormSheet title="Editar idea" trigger={{ label: "Editar" }} action={saveIdea.bind(null, idea.id)}>
                  <IdeaFields idea={idea} />
                </FormSheet>
                <ActionButton action={deleteRow.bind(null, "ideas", idea.id)} confirm={`¿Borrar «${idea.title}»?`} className="min-h-8 text-[13px] font-semibold text-muted">
                  Borrar
                </ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>

      <FormSheet title="Nueva idea" trigger={{ label: "Nueva idea", icon: "plus", variant: "drop" }} action={saveIdea.bind(null, null)} submitLabel="Guardar idea">
        <IdeaFields />
      </FormSheet>
    </>
  );
}
