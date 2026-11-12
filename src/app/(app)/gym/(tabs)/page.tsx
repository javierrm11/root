import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Chip, EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { daysBetween } from "@/lib/dates";
import { startWorkout } from "@/features/gym/actions";
import { formatKg, formatSet } from "@/features/gym/logic";
import { getGymToday } from "@/features/gym/queries";

export const metadata = { title: "Gym" };

export default function EntrenoPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  const { today, routinesToday, active, week, weekDone, weekPlanned, records, routines } = await getGymToday();

  return (
    <>
      {active ? (
        <Section title="Entreno en curso">
          <ButtonLink href={`/gym/entreno/${active.id}`} wide icon="play">
            Seguir entrenando
          </ButtonLink>
        </Section>
      ) : (
        <Section title="Hoy toca">
          {routinesToday.length ? (
            <div className="flex flex-col gap-4">
              {routinesToday.map((r) => (
                <div key={r.id} className="flex flex-col gap-2">
                  <p className="text-xl font-semibold">{r.name}</p>
                  <p className="text-[13px] text-muted">
                    {[`${r.items.length} ejercicios`, r.notes, r.lastDay ? `la última vez hace ${daysBetween(r.lastDay, today)} días` : null].filter(Boolean).join(" · ")}
                  </p>
                  <ActionButton action={startWorkout.bind(null, r.id)} className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-ink">
                    <Icon name="play" size={18} />
                    Empezar entreno
                  </ActionButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {routines.length ? "Hoy no tienes rutina asignada. Descansa o haz un entreno libre." : "Crea tus rutinas en la pestaña Rutinas y asígnales días."}
              </p>
              <ActionButton action={startWorkout.bind(null, null)} className="h-11 w-full rounded-xl bg-surface-2 font-semibold">
                Entreno libre
              </ActionButton>
            </div>
          )}
        </Section>
      )}

      <Section title="Esta semana" aside={<span className="text-[13px] text-muted">{weekDone} de {weekPlanned || "—"} entrenos</span>}>
        <div className="grid grid-cols-7 gap-1 text-center">
          {week.map((d) => (
            <span key={d.day} className={cn("flex flex-col items-center gap-1.5 text-xs font-semibold", d.today ? "text-acc" : "text-muted")}>
              {d.label}
              <span
                title={d.planned ?? "Descanso"}
                className={cn(
                  "grid size-[30px] place-items-center rounded-full text-[10px] font-bold",
                  d.done ? "bg-accent text-ink" : d.planned ? "border-[1.5px] border-acc text-acc" : "border-[1.5px] border-dashed border-line",
                )}
              >
                {d.planned?.[0] ?? ""}
              </span>
            </span>
          ))}
        </div>
      </Section>

      <Section
        title="Récords personales"
        aside={
          <Link href="/gym/progreso" className="text-[13px] font-semibold text-acc">
            Ver progreso
          </Link>
        }
      >
        {records.length ? (
          <RowList>
            {records.map(({ exercise, best }) => (
              <Row key={exercise.id} title={exercise.name} subtitle={`${formatSet(best.set)} · 1RM estimado`} trailing={<Chip tone="gym">{formatKg(Math.round(best.max))}</Chip>} />
            ))}
          </RowList>
        ) : (
          <EmptyState icon="gym" title="Sin récords todavía">
            Aparecen solos cuando marques series con peso.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
