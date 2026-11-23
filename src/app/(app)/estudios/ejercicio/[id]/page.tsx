import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { Markdown } from "@/components/ui/markdown";
import { Chip, Columns, EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { aiConfigured } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { EXERCISE_STATUS, PRACTICE_MODES, keysOf } from "@/lib/constants";
import { formatShortDay } from "@/lib/dates";
import { deleteRow } from "@/features/common/actions";
import { deleteExerciseType, setExerciseStatus } from "@/features/estudios/actions";
import { generateGuide, generatePractice } from "@/features/estudios/ai";
import { AiButton } from "@/features/estudios/components/ai-button";
import { exerciseTypeMeta } from "@/features/estudios/components/exercise-types";
import { CLAUDE_PROMPTS, passed } from "@/features/estudios/logic";
import { getExerciseTypeView } from "@/features/estudios/queries";
import { getSettings } from "@/features/ajustes/queries";

export const metadata = { title: "Tipo de ejercicio" };
// Generar la guía o una tanda con Gemini puede tardar.
export const maxDuration = 300;

type Params = Promise<{ id: string }>;

export default function ExerciseTypePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <ExerciseTypeView params={params} />
    </Suspense>
  );
}

async function ExerciseTypeView({ params }: { params: Params }) {
  const { id } = await params;
  const [{ type, topic, sets, next }, settings] = await Promise.all([getExerciseTypeView(id), getSettings()]);
  const gemini = aiConfigured() && settings.ai.practica;
  const ctx = { subject: topic.subjectName, topic: topic.title, topicId: topic.id, typeId: type.id, typeName: type.name };

  return (
    <>
      <PageHeader
        title={type.name}
        eyebrow={`${topic.subjectName} · ${topic.title}`}
        back={{ href: `/estudios/asignatura/${topic.subjectId}`, label: "Asignatura" }}
      />
      {(type.description || exerciseTypeMeta(type)) && (
        <div className="-mt-2 mb-2 flex flex-col gap-1">
          {type.description && <p className="text-[15px]">{type.description}</p>}
          {exerciseTypeMeta(type) && <p className="font-mono text-xs text-muted">{exerciseTypeMeta(type)}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
        {keysOf(EXERCISE_STATUS).map((status) => (
          <ActionButton
            key={status}
            action={setExerciseStatus.bind(null, type.id, status)}
            pressed={type.status === status}
            className={cn("chip h-8", type.status === status ? `tone-${EXERCISE_STATUS[status].tone}` : "tone-mut opacity-60")}
          >
            {EXERCISE_STATUS[status].label}
          </ActionButton>
        ))}
      </div>

      <Columns>
        <div>
          <Section title="Cómo se resuelve" aside={type.guide_at && <span className="text-[13px] text-muted">{formatShortDay(type.guide_at.slice(0, 10))}</span>}>
            {type.guide ? (
              <Markdown>{type.guide}</Markdown>
            ) : (
              <EmptyState icon="lightbulb" title="Sin guía todavía">
                Pídele a Claude un poco de teoría, los pasos para resolverlo y un ejemplo resuelto. La guardará aquí.
              </EmptyState>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton value={CLAUDE_PROMPTS.guide(ctx)} label={type.guide ? "Pedir otra a Claude" : "Pedir a Claude"} />
              {gemini && <AiButton action={generateGuide.bind(null, type.id)}>{type.guide ? "Rehacer con Gemini" : "Generar con Gemini"}</AiButton>}
            </div>
          </Section>
        </div>

        <div>
          <Section title="Practicar">
            <div className="flex flex-col gap-3">
              {keysOf(PRACTICE_MODES).map((mode) => (
                <div key={mode} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="block text-sm font-semibold">{PRACTICE_MODES[mode].label}</span>
                    <span className="block text-[13px] text-muted">{PRACTICE_MODES[mode].short}</span>
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <CopyButton value={CLAUDE_PROMPTS.practice(ctx, mode)} label="Pedir a Claude" />
                    {gemini && <AiButton action={generatePractice.bind(null, type.id, mode)}>Gemini</AiButton>}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tandas">
            {sets.length ? (
              <RowList>
                {sets.map((s) => {
                  const result = s.finished_at && s.total ? `${s.correct}/${s.total}` : null;
                  return (
                    <Row
                      key={s.id}
                      title={
                        <Link href={`/estudios/practica/${s.id}`} className="font-semibold">
                          {PRACTICE_MODES[s.mode].label} · {formatShortDay(s.created_at.slice(0, 10))}
                        </Link>
                      }
                      subtitle={s.progress ? `Sin terminar · ${s.progress.done}/${s.progress.total} respondidos` : "Terminada"}
                      trailing={
                        <span className="flex items-center gap-1">
                          {result && <Chip tone={passed(s.correct ?? 0, s.total ?? 0) ? "gym" : "work"}>{result}</Chip>}
                          <ActionButton
                            action={deleteRow.bind(null, "practice_sets", s.id)}
                            confirm="¿Borrar esta tanda?"
                            label="Borrar tanda"
                            className="grid size-9 place-items-center text-muted"
                          >
                            <Icon name="x" size={15} />
                          </ActionButton>
                        </span>
                      }
                    />
                  );
                })}
              </RowList>
            ) : (
              <p className="text-sm text-muted">Aún no has hecho ninguna tanda de este tipo.</p>
            )}
          </Section>

          {next && (
            <Section title="Siguiente tipo">
              <Link href={`/estudios/ejercicio/${next.id}`} className="flex min-h-12 items-center justify-between gap-3">
                <span className="text-sm font-semibold">{next.name}</span>
                <Icon name="chevron-right" size={18} className="text-muted" />
              </Link>
            </Section>
          )}
        </div>
      </Columns>

      <div className="mt-6 flex justify-center">
        <ActionButton
          action={deleteExerciseType.bind(null, type.id)}
          confirm={`¿Borrar «${type.name}» con su guía y sus tandas?`}
          className="min-h-11 text-[13px] font-semibold text-muted"
        >
          Borrar tipo de ejercicio
        </ActionButton>
      </div>
    </>
  );
}
