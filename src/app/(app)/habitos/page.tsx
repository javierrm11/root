import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { InlineAdd } from "@/components/ui/inline-add";
import { EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { deleteRow } from "@/features/common/actions";
import { createHabit } from "@/features/hoy/actions";
import { getHabits } from "@/features/hoy/queries";

export const metadata = { title: "Hábitos" };

export default function HabitosPage() {
  return (
    <>
      <PageHeader title="Hábitos" back={{ href: "/", label: "Hoy" }} />
      <Suspense fallback={<Skeleton lines={4} />}>
        <Habits />
      </Suspense>
    </>
  );
}

async function Habits() {
  const habits = await getHabits();
  return (
    <Section title="Tus hábitos diarios">
      {habits.length ? (
        <RowList>
          {habits.map((habit) => (
            <Row
              key={habit.id}
              title={habit.name}
              trailing={
                <ActionButton
                  action={deleteRow.bind(null, "habits", habit.id)}
                  confirm={`¿Borrar «${habit.name}» y su historial?`}
                  label="Borrar hábito"
                  className="grid size-9 place-items-center text-muted"
                >
                  <Icon name="trash" size={16} />
                </ActionButton>
              }
            />
          ))}
        </RowList>
      ) : (
        <EmptyState icon="flame" title="Empieza por uno o dos">
          Hábitos pequeños que puedas cumplir cada día: leer 20 min, 2 L de agua, sin móvil la primera hora…
        </EmptyState>
      )}
      <div className="mt-4">
        <InlineAdd action={createHabit} name="name" placeholder="Nuevo hábito…" />
      </div>
      <p className="mt-3 text-[13px] text-muted">Se marcan desde Hoy. La racha cuenta los días seguidos con al menos uno cumplido.</p>
    </Section>
  );
}
