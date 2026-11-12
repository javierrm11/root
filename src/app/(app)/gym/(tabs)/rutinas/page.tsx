import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Chip, EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { WEEKDAYS } from "@/lib/constants";
import { deleteRow } from "@/features/common/actions";
import { addRoutineExercise, saveRoutine, startWorkout } from "@/features/gym/actions";
import { RoutineExerciseFields, RoutineFields } from "@/features/gym/components/fields";
import { getRoutines } from "@/features/gym/queries";

export const metadata = { title: "Rutinas" };

export default function RutinasPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Routines />
    </Suspense>
  );
}

async function Routines() {
  const { routines, exercises } = await getRoutines();

  return (
    <>
      {!routines.length && (
        <EmptyState icon="gym" title="Sin rutinas">
          Crea tus rutinas (empuje, tirón, pierna…), añádeles ejercicios y elige qué días tocan.
        </EmptyState>
      )}

      {routines.map((routine) => (
        <Section
          key={routine.id}
          title={routine.name}
          aside={<Chip tone="gym">{routine.weekdays.length ? routine.weekdays.map((d) => WEEKDAYS[d].slice(0, 3)).join(" · ") : "Sin días"}</Chip>}
        >
          {routine.notes && <p className="mb-1 text-[13px] text-muted">{routine.notes}</p>}
          <RowList>
            {routine.items.map((item) => (
              <Row
                key={item.id}
                title={item.name}
                subtitle={`${item.sets} × ${item.reps}${item.rest_s ? ` · descanso ${item.rest_s} s` : ""}`}
                trailing={
                  <ActionButton action={deleteRow.bind(null, "routine_exercises", item.id)} label="Quitar de la rutina" className="grid size-8 place-items-center text-muted">
                    <Icon name="x" size={15} />
                  </ActionButton>
                }
              />
            ))}
          </RowList>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <FormSheet title={`Añadir a ${routine.name}`} trigger={{ label: "Añadir ejercicio" }} action={addRoutineExercise.bind(null, routine.id)} submitLabel="Añadir">
              <RoutineExerciseFields exercises={exercises} />
            </FormSheet>
            <FormSheet title="Editar rutina" trigger={{ label: "Editar" }} action={saveRoutine.bind(null, routine.id)}>
              <RoutineFields routine={routine} />
            </FormSheet>
            <ActionButton action={startWorkout.bind(null, routine.id)} className="min-h-8 text-[13px] font-semibold text-acc">
              Empezar ahora
            </ActionButton>
            <ActionButton action={deleteRow.bind(null, "routines", routine.id)} confirm={`¿Borrar la rutina «${routine.name}»?`} className="min-h-8 text-[13px] font-semibold text-muted">
              Borrar
            </ActionButton>
          </div>
        </Section>
      ))}

      <FormSheet title="Nueva rutina" trigger={{ label: "Nueva rutina", icon: "plus", variant: "drop" }} action={saveRoutine.bind(null, null)} submitLabel="Crear">
        <RoutineFields />
      </FormSheet>
    </>
  );
}
