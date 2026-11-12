import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { InlineAdd } from "@/components/ui/inline-add";
import { Skeleton } from "@/components/ui/primitives";
import { addWorkoutExercise, deleteWorkout, finishWorkout } from "@/features/gym/actions";
import { WorkoutLive } from "@/features/gym/components/workout-live";
import { getWorkout } from "@/features/gym/queries";

export const metadata = { title: "Entreno" };

type Params = Promise<{ id: string }>;

export default function WorkoutPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Workout params={params} />
    </Suspense>
  );
}

async function Workout({ params }: { params: Params }) {
  const { id } = await params;
  const { workout, routineName, exercises } = await getWorkout(id);
  const finished = Boolean(workout.finished_at);

  return (
    <>
      <PageHeader title={routineName} eyebrow={finished ? "Entreno terminado" : "Entreno en curso"} back={{ href: "/gym", label: "Gym" }} />
      <WorkoutLive workoutId={workout.id} exercises={exercises} />
      <div className="mt-3">
        <InlineAdd action={addWorkoutExercise.bind(null, workout.id)} placeholder="Añadir ejercicio…" />
      </div>
      {!finished && (
        <ActionButton action={finishWorkout.bind(null, workout.id)} className="mt-5 h-11 w-full rounded-xl bg-accent font-semibold text-ink">
          Terminar entreno
        </ActionButton>
      )}
      <div className="mt-4 flex justify-center">
        <ActionButton action={deleteWorkout.bind(null, workout.id)} confirm="¿Borrar este entreno y sus series?" className="min-h-11 text-[13px] font-semibold text-muted">
          Borrar entreno
        </ActionButton>
      </div>
    </>
  );
}
