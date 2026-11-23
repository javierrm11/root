import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/primitives";
import { PRACTICE_MODES } from "@/lib/constants";
import { PracticeLive, type LiveItem } from "@/features/estudios/components/practice-live";
import { CLAUDE_PROMPTS } from "@/features/estudios/logic";
import { getPracticeView } from "@/features/estudios/queries";

export const metadata = { title: "Práctica" };

type Params = Promise<{ id: string }>;

export default function PracticePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Practice params={params} />
    </Suspense>
  );
}

async function Practice({ params }: { params: Params }) {
  const { id } = await params;
  return <PracticeView id={id} />;
}

async function PracticeView({ id }: { id: string }) {
  "use cache: private";
  cacheLife("pantalla");
  const { set, items, type, topic, next } = await getPracticeView(id);
  const ctx = { subject: topic.subjectName, topic: topic.title, topicId: topic.id, typeId: type.id, typeName: type.name };
  const typeHref = `/estudios/ejercicio/${type.id}`;

  // El Markdown (con fórmulas) se pinta aquí y llega hecho al componente de cliente.
  const live: LiveItem[] = items.map((i) => ({
    id: i.id,
    question: <Markdown>{i.question}</Markdown>,
    options: i.options?.map((o, n) => <Markdown key={n}>{o}</Markdown>) ?? null,
    correctOption: i.correct_option,
    answer: i.answer ? <Markdown>{i.answer}</Markdown> : null,
    hint: i.hint ? <Markdown>{i.hint}</Markdown> : null,
    solution: <Markdown>{i.solution}</Markdown>,
    chosen: i.chosen_option,
    correct: i.correct,
  }));

  const anotherSet = (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={CLAUDE_PROMPTS.practice(ctx, set.mode)} label="Pedir otra tanda a Claude" variant="primary" />
    </div>
  );
  const outcome = {
    pass: (
      <>
        <p className="text-[15px]">Tipo de ejercicio dominado. {next ? `Toca el siguiente: ${next.name}.` : "Has dominado todos los tipos del tema."}</p>
        <div className="flex flex-wrap gap-2">
          {next ? (
            <ButtonLink href={`/estudios/ejercicio/${next.id}`} icon="chevron-right">
              Siguiente tipo
            </ButtonLink>
          ) : (
            <ButtonLink href={`/estudios/asignatura/${topic.subjectId}`}>Volver a la asignatura</ButtonLink>
          )}
          <ButtonLink href={typeHref} variant="ghost">
            Ver la guía
          </ButtonLink>
        </div>
      </>
    ),
    fail: (
      <>
        <p className="text-[15px]">Repasa la guía y haz otra tanda centrada en lo que has fallado.</p>
        {anotherSet}
        <ButtonLink href={typeHref} variant="ghost">
          Ver la guía
        </ButtonLink>
      </>
    ),
  };

  return (
    <>
      <PageHeader title={type.name} eyebrow={`${PRACTICE_MODES[set.mode].label} · ${topic.title}`} back={{ href: typeHref, label: "Tipo de ejercicio" }} />
      {live.length ? (
        <PracticeLive setId={set.id} mode={set.mode} items={live} finished={Boolean(set.finished_at)} outcome={outcome} />
      ) : (
        <p className="text-sm text-muted">Esta tanda no tiene ejercicios.</p>
      )}
    </>
  );
}
