import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { InlineAdd } from "@/components/ui/inline-add";
import { Chip, EmptyState, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { GOAL_METRICS } from "@/lib/constants";
import { formatShortDay } from "@/lib/dates";
import { deleteRow } from "@/features/common/actions";
import { saveGoal, setGoalValue } from "@/features/objetivos/actions";
import { GoalFields, GoalProgress } from "@/features/objetivos/components";
import { getGoals } from "@/features/objetivos/queries";

export const metadata = { title: "Objetivos" };

export default function ObjetivosPage() {
  return (
    <>
      <PageHeader title="Objetivos" eyebrow="Del trimestre" back={{ href: "/", label: "Hoy" }} />
      <Suspense fallback={<Skeleton lines={5} />}>
        <Goals />
      </Suspense>
    </>
  );
}

async function Goals() {
  const { today, goals, subjects, exercises, average } = await getGoals();
  const nextDeadline = goals.filter((g) => g.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0];

  return (
    <>
      <StatRow>
        <Stat value={goals.length} label="Activos" />
        <Stat value={`${average} %`} label="De media" accent />
        <Stat value={nextDeadline ? nextDeadline.daysLeft : "—"} label="Días al próximo" />
      </StatRow>

      {!goals.length && (
        <EmptyState icon="target" title="Sin objetivos">
          Conecta cada objetivo a un dato de la app y su progreso se actualizará solo: el dominio de una asignatura, un récord del gym, los vídeos publicados…
        </EmptyState>
      )}

      {goals.map((goal) => (
        <Section key={goal.id} aside={<Chip tone={GOAL_METRICS[goal.metric].tone}>{goal.pct} %</Chip>} title={`Hasta el ${formatShortDay(goal.end_date)}`}>
          <GoalProgress goal={goal} />
          <p className="text-[13px] text-muted">{goal.source}</p>
          {goal.metric === "manual" && (
            <div className="mt-2">
              <InlineAdd action={setGoalValue.bind(null, goal.id)} name="value" placeholder="Nuevo valor…" />
            </div>
          )}
          <div className="mt-2 flex gap-4">
            <FormSheet title="Editar objetivo" trigger={{ label: "Editar" }} action={saveGoal.bind(null, goal.id)}>
              <GoalFields goal={goal} subjects={subjects} exercises={exercises} today={today} />
            </FormSheet>
            <ActionButton action={deleteRow.bind(null, "goals", goal.id)} confirm={`¿Borrar «${goal.title}»?`} className="min-h-8 text-[13px] font-semibold text-muted">
              Borrar
            </ActionButton>
          </div>
        </Section>
      ))}

      <FormSheet title="Nuevo objetivo" trigger={{ label: "Nuevo objetivo", icon: "plus", variant: "drop" }} action={saveGoal.bind(null, null)} submitLabel="Crear">
        <GoalFields subjects={subjects} exercises={exercises} today={today} />
      </FormSheet>
    </>
  );
}
