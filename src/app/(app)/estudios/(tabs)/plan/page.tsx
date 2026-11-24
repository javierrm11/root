import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { ActionButton } from "@/components/ui/action-button";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { EmptyState, LinkPills, ProgressBar, Section, Skeleton } from "@/components/ui/primitives";
import { EXAM_KINDS } from "@/lib/constants";
import { capitalize, countdown, formatDay, formatLongDay } from "@/lib/dates";
import { reorganizeOverdue } from "@/features/estudios/actions";
import { AddStudyTaskSheet, StudyTaskRow } from "@/features/estudios/components/plan";
import { CLAUDE_PROMPTS } from "@/features/estudios/logic";
import { getStudyPlan } from "@/features/estudios/queries";

export const metadata = { title: "Plan de exámenes" };

type SearchParams = Promise<{ ver?: string }>;
const RANGES = { "2": "2 semanas", "4": "1 mes", todo: "Todo" } as const;

export default function PlanPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={8} />}>
      <Plan searchParams={searchParams} />
    </Suspense>
  );
}

async function Plan({ searchParams }: { searchParams: SearchParams }) {
  const { ver } = await searchParams;
  return <PlanView ver={ver} />;
}

async function PlanView({ ver }: { ver?: string }) {
  "use cache: private";
  cacheLife("pantalla");
  const range = ver && ver in RANGES ? (ver as keyof typeof RANGES) : "2";
  const plan = await getStudyPlan(range === "todo" ? 0 : Number(range));

  return (
    <>
      {plan.exams.length > 0 && (
        <div className="-mx-5 mb-3.5 flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none]">
          {plan.exams.map((e) => (
            <div key={e.id} className="flex w-44 shrink-0 flex-col gap-1.5 rounded-[20px] bg-accent p-3.5 text-ink">
              <span className="text-[11px] font-extrabold tracking-wide uppercase opacity-85">{EXAM_KINDS[e.kind].label} · {formatDay(e.exam_date)}</span>
              <span className="truncate text-[15px] font-extrabold">{e.subjectName}</span>
              <span className="text-[28px] leading-none font-extrabold tracking-[-0.03em]">{countdown(e.days)}</span>
              <span className="text-xs font-bold opacity-90">
                {e.planTotal ? `Plan: ${e.planDone} de ${e.planTotal}` : "Sin plan todavía"}
              </span>
            </div>
          ))}
        </div>
      )}

      {plan.total === 0 ? (
        <Section>
          <EmptyState icon="list" title="Haz tu plan de exámenes con Claude">
            Claude mira tus temas, tu dominio y las fechas de examen, y te reparte el estudio día a día: qué tema, qué ejercicios y qué repasar.
          </EmptyState>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={CLAUDE_PROMPTS.plan()} label="Pedir el plan a Claude" variant="primary" />
            <AddStudyTaskSheet today={plan.today} subjects={plan.subjects} />
          </div>
        </Section>
      ) : (
        <>
          <LinkPills items={Object.entries(RANGES).map(([key, label]) => ({ href: `?ver=${key}`, label, active: key === range }))} />
          <div className="mb-3.5 flex flex-wrap gap-2">
            <CopyButton value={CLAUDE_PROMPTS.plan()} label="Rehacer con Claude" />
            <AddStudyTaskSheet today={plan.today} subjects={plan.subjects} />
          </div>

          {plan.overdue.length > 0 && (
            <Section
              title={`Atrasadas · ${plan.overdue.length}`}
              aside={
                <ActionButton action={reorganizeOverdue} className="tinted tone-acc inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold">
                  <Icon name="repeat" size={14} />
                  Reorganizar
                </ActionButton>
              }
            >
              <p className="mb-1 text-[13px] text-muted">Se reparten entre los próximos días, antes del examen de cada asignatura.</p>
              <div className="divide-y divide-line">
                {plan.overdue.map((task) => (
                  <StudyTaskRow key={task.id} task={task} showDay={formatDay(task.day)} />
                ))}
              </div>
            </Section>
          )}

          {plan.days.map(({ day, tasks }) => {
            const done = tasks.filter((t) => t.done).length;
            return (
              <Section
                key={day}
                title={day === plan.today ? `Hoy, ${formatLongDay(day)}` : capitalize(formatLongDay(day))}
                aside={<span className="text-[13px] font-bold text-muted">{done}/{tasks.length}</span>}
              >
                <ProgressBar value={(done / tasks.length) * 100} className="mb-1" />
                <div className="divide-y divide-line">
                  {tasks.map((task) => (
                    <StudyTaskRow key={task.id} task={task} />
                  ))}
                </div>
              </Section>
            );
          })}
          {!plan.days.length && (
            <Section>
              <p className="text-sm text-muted">Nada en estas fechas.</p>
            </Section>
          )}
          {plan.later > 0 && <p className="mt-3 text-center text-[13px] font-semibold text-muted">Y {plan.later} tareas más adelante.</p>}
        </>
      )}
    </>
  );
}
