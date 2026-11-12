import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { groupBy } from "@/lib/collections";
import { addDays, formatShortDay, todayISO, weekStart, weekdayMonday } from "@/lib/dates";
import { signPaths } from "@/lib/storage";
import { must, requireUser } from "@/lib/supabase/server";
import type { BodyMetric, Exercise, ProgressPhoto, Routine, RoutineExercise, Workout, WorkoutSet } from "@/lib/types";
import { bestSet, formatSet } from "./logic";

const HISTORY_DAYS = 180;

/** Ejercicios, rutinas y entrenos recientes con sus series, una vez por petición. */
const loadGym = cache(async () => {
  const { supabase, userId } = await requireUser();
  const today = todayISO();
  const [exercises, routines, routineItems, workouts] = await Promise.all([
    supabase.from("exercises").select("*").order("name").then(must<Exercise[]>),
    supabase.from("routines").select("*").order("created_at").then(must<Routine[]>),
    supabase.from("routine_exercises").select("*").order("position").then(must<RoutineExercise[]>),
    supabase.from("workouts").select("*").gte("day", addDays(today, -HISTORY_DAYS)).order("day", { ascending: false }).then(must<Workout[]>),
  ]);
  const sets = workouts.length
    ? await supabase.from("workout_sets").select("*").in("workout_id", workouts.map((w) => w.id)).order("set_no").then(must<WorkoutSet[]>)
    : [];
  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "Ejercicio";
  const itemsBy = groupBy(routineItems, (i) => i.routine_id);
  return {
    supabase,
    userId,
    today,
    exercises,
    exerciseName,
    routines: routines.map((r) => ({ ...r, items: (itemsBy.get(r.id) ?? []).map((i) => ({ ...i, name: exerciseName(i.exercise_id) })) })),
    workouts,
    setsByWorkout: groupBy(sets, (s) => s.workout_id),
    setsByExercise: groupBy(sets, (s) => s.exercise_id),
  };
});

export type RoutineWithItems = Awaited<ReturnType<typeof loadGym>>["routines"][number];

/** Récords: mejor serie de cada ejercicio (por 1RM estimado). */
async function records() {
  const { exercises, setsByExercise } = await loadGym();
  return exercises
    .map((e) => ({ exercise: e, best: bestSet(setsByExercise.get(e.id) ?? []) }))
    .filter((r): r is { exercise: Exercise; best: NonNullable<ReturnType<typeof bestSet>> } => r.best !== null)
    .sort((a, b) => b.best.max - a.best.max);
}

/** Pestaña Entreno: lo que toca hoy, la semana y los récords. */
export async function getGymToday() {
  const { today, routines, workouts } = await loadGym();
  const weekday = weekdayMonday(today);
  const monday = weekStart(today);
  const finished = workouts.filter((w) => w.finished_at);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    const planned = routines.find((r) => r.weekdays.includes(i));
    return { day, label: "LMXJVSD"[i], done: finished.some((w) => w.day === day), planned: planned?.name ?? null, today: day === today };
  });
  return {
    today,
    routinesToday: routines.filter((r) => r.weekdays.includes(weekday)).map((r) => {
      const last = finished.find((w) => w.routine_id === r.id);
      return { ...r, lastDay: last?.day ?? null };
    }),
    active: workouts.find((w) => !w.finished_at) ?? null,
    week,
    weekDone: week.filter((d) => d.done).length,
    weekPlanned: week.filter((d) => d.planned).length,
    records: (await records()).slice(0, 4),
    routines,
  };
}

/** Entreno en directo: series agrupadas por ejercicio con lo que hiciste la última vez. */
export async function getWorkout(id: string) {
  const { workouts, setsByWorkout, routines, exerciseName } = await loadGym();
  const workout = workouts.find((w) => w.id === id);
  if (!workout) notFound();
  const sets = setsByWorkout.get(id) ?? [];
  const previous = (exerciseId: string) => {
    const prev = workouts.find((w) => w.id !== id && w.finished_at && (setsByWorkout.get(w.id) ?? []).some((s) => s.exercise_id === exerciseId));
    return (prev ? (setsByWorkout.get(prev.id) ?? []) : []).filter((s) => s.exercise_id === exerciseId);
  };
  const order = [...new Set(sets.map((s) => s.exercise_id))];
  return {
    workout,
    routineName: routines.find((r) => r.id === workout.routine_id)?.name ?? "Entreno libre",
    exercises: order.map((exerciseId) => {
      const prev = previous(exerciseId);
      return {
        exerciseId,
        name: exerciseName(exerciseId),
        sets: sets
          .filter((s) => s.exercise_id === exerciseId)
          .map((s) => ({ ...s, prev: prev.find((p) => p.set_no === s.set_no) ? formatSet(prev.find((p) => p.set_no === s.set_no)!) : "—" })),
      };
    }),
  };
}

/** Pestaña Progreso: mejor peso por semana (8 semanas) de un ejercicio y récords. */
export async function getProgress(exerciseId?: string) {
  const { today, exercises, workouts, setsByExercise } = await loadGym();
  const withData = exercises.filter((e) => bestSet(setsByExercise.get(e.id) ?? []));
  const selected = withData.find((e) => e.id === exerciseId) ?? withData[0] ?? null;
  const dayOf = new Map(workouts.map((w) => [w.id, w.day]));
  const firstWeek = addDays(weekStart(today), -7 * 7);

  const weeks = Array.from({ length: 8 }, (_, i) => addDays(firstWeek, i * 7));
  const bars = selected
    ? weeks.map((start, i) => {
        const end = addDays(start, 7);
        const inWeek = (setsByExercise.get(selected.id) ?? []).filter((s) => {
          const day = dayOf.get(s.workout_id);
          return s.done && day && day >= start && day < end;
        });
        const top = Math.max(0, ...inWeek.map((s) => Number(s.weight_kg ?? 0)));
        return { label: i === 7 ? "Esta" : formatShortDay(start).split(" ")[0], value: top, start };
      })
    : [];
  const withValue = bars.filter((b) => b.value > 0);
  const best = selected ? bestSet(setsByExercise.get(selected.id) ?? []) : null;
  return {
    exercises: withData,
    selected,
    bars,
    record: best ? Number(best.set.weight_kg) : null,
    estimated: best ? best.max : null,
    gain: withValue.length >= 2 ? withValue[withValue.length - 1].value - withValue[0].value : null,
    records: await records(),
  };
}

/** Pestaña Rutinas. */
export async function getRoutines() {
  const { routines, exercises } = await loadGym();
  return { routines, exercises };
}

/** Pestaña Cuerpo: peso, medidas y fotos. */
export async function getBody() {
  const { supabase, userId } = await requireUser();
  const [metrics, photos] = await Promise.all([
    supabase.from("body_metrics").select("*").order("day", { ascending: false }).limit(24).then(must<BodyMetric[]>),
    supabase.from("progress_photos").select("*").order("day", { ascending: false }).limit(30).then(must<ProgressPhoto[]>),
  ]);
  const urls = await signPaths(supabase, photos.map((p) => p.storage_path));
  const weights = metrics.filter((m) => m.weight_kg !== null);
  const latest = (key: "chest_cm" | "waist_cm" | "arm_cm") => {
    const rows = metrics.filter((m) => m[key] !== null);
    return { value: rows[0]?.[key] ?? null, change: rows.length > 1 ? Number(rows[0][key]) - Number(rows[rows.length - 1][key]) : null };
  };
  return {
    userId,
    weights,
    weight: weights[0] ? Number(weights[0].weight_kg) : null,
    weightChange: weights.length > 1 ? Number(weights[0].weight_kg) - Number(weights[weights.length - 1].weight_kg) : null,
    measures: { chest: latest("chest_cm"), waist: latest("waist_cm"), arm: latest("arm_cm") },
    photos: photos.map((p) => ({ ...p, url: urls.get(p.storage_path) ?? null })),
  };
}

/** Mejor peso levantado en un ejercicio (para objetivos). */
export async function exerciseRecord(exerciseId: string) {
  const { setsByExercise } = await loadGym();
  return Math.max(0, ...(setsByExercise.get(exerciseId) ?? []).filter((s) => s.done).map((s) => Number(s.weight_kg ?? 0)));
}

export async function getExercises() {
  const { exercises } = await loadGym();
  return exercises;
}
