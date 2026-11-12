"use server";

import { redirect } from "next/navigation";
import { invalid, mutate, upsert } from "@/lib/actions";
import { PHOTO_ANGLES, keysOf } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { oneOf, optInt, optNumber, optText, text, uploadedFile } from "@/lib/form";
import { removeRowFile } from "@/lib/storage";
import type { Db } from "@/lib/supabase/server";
import type { WorkoutSet } from "@/lib/types";
import { repsTarget } from "./logic";

/** Busca un ejercicio por nombre o lo crea. */
async function exerciseId(supabase: Db, name: string) {
  const { data } = await supabase.from("exercises").select("id").ilike("name", name).maybeSingle();
  if (data) return data.id as string;
  const { data: created, error } = await supabase.from("exercises").insert({ name }).select("id").single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

// ─── Rutinas ────────────────────────────────────────────────────────
export async function saveRoutine(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const name = text(fd, "name");
    if (!name) return invalid("Ponle un nombre a la rutina");
    const weekdays = fd.getAll("weekdays").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    return upsert(supabase, "routines", id, { name, weekdays, notes: optText(fd, "notes") });
  });
}

export async function addRoutineExercise(routineId: string, fd: FormData) {
  return mutate(async ({ supabase }) => {
    const name = text(fd, "name");
    if (!name) return invalid("Escribe el ejercicio");
    const { count } = await supabase.from("routine_exercises").select("id", { count: "exact", head: true }).eq("routine_id", routineId);
    return supabase.from("routine_exercises").insert({
      routine_id: routineId,
      exercise_id: await exerciseId(supabase, name),
      position: count ?? 0,
      sets: Math.min(20, Math.max(1, optInt(fd, "sets") ?? 3)),
      reps: text(fd, "reps") || "8",
      rest_s: optInt(fd, "rest_s"),
    });
  });
}

// ─── Entrenos ───────────────────────────────────────────────────────
/** Empieza un entreno: copia las series de la rutina con el peso de la última vez. */
export async function startWorkout(routineId: string | null) {
  let workoutId: string | null = null;
  const result = await mutate(async ({ supabase }) => {
    const { data: workout, error } = await supabase.from("workouts").insert({ routine_id: routineId, day: todayISO() }).select("id").single();
    if (error) return { error };
    workoutId = workout.id;
    if (!routineId) return;

    const { data: items } = await supabase.from("routine_exercises").select("*").eq("routine_id", routineId).order("position");
    const exerciseIds = (items ?? []).map((i) => i.exercise_id);
    const { data: history } = exerciseIds.length
      ? await supabase.from("workout_sets").select("exercise_id, set_no, weight_kg, reps, created_at").in("exercise_id", exerciseIds).eq("done", true).order("created_at", { ascending: false }).limit(200)
      : { data: [] as Array<Pick<WorkoutSet, "exercise_id" | "set_no" | "weight_kg" | "reps">> };

    const rows = (items ?? []).flatMap((item) =>
      Array.from({ length: item.sets }, (_, i) => {
        const last = history?.find((h) => h.exercise_id === item.exercise_id && h.set_no === i + 1);
        return { workout_id: workout.id, exercise_id: item.exercise_id, set_no: i + 1, weight_kg: last?.weight_kg ?? null, reps: last?.reps ?? repsTarget(item.reps) };
      }),
    );
    if (rows.length) return supabase.from("workout_sets").insert(rows);
  });
  if (result?.error || !workoutId) return result;
  redirect(`/gym/entreno/${workoutId}`);
}

/** Guarda una serie mientras entrenas (sin refrescar la pantalla). */
export async function saveSet(id: string, weight: number | null, reps: number | null, done: boolean) {
  return mutate(({ supabase }) => supabase.from("workout_sets").update({ weight_kg: weight, reps, done }).eq("id", id), { refreshRoute: false });
}

export async function addSet(workoutId: string, exerciseIdValue: string) {
  return mutate(async ({ supabase }) => {
    const { data } = await supabase.from("workout_sets").select("set_no, weight_kg, reps").eq("workout_id", workoutId).eq("exercise_id", exerciseIdValue).order("set_no", { ascending: false }).limit(1);
    const last = data?.[0];
    return supabase.from("workout_sets").insert({ workout_id: workoutId, exercise_id: exerciseIdValue, set_no: (last?.set_no ?? 0) + 1, weight_kg: last?.weight_kg ?? null, reps: last?.reps ?? null });
  });
}

export async function addWorkoutExercise(workoutId: string, fd: FormData) {
  return mutate(async ({ supabase }) => {
    const name = text(fd, "title");
    if (!name) return invalid("Escribe el ejercicio");
    return supabase.from("workout_sets").insert({ workout_id: workoutId, exercise_id: await exerciseId(supabase, name), set_no: 1 });
  });
}

export async function finishWorkout(id: string) {
  const result = await mutate(({ supabase }) => supabase.from("workouts").update({ finished_at: new Date().toISOString() }).eq("id", id));
  if (result?.error) return result;
  redirect("/gym");
}

export async function deleteWorkout(id: string) {
  const result = await mutate(({ supabase }) => supabase.from("workouts").delete().eq("id", id));
  if (result?.error) return result;
  redirect("/gym");
}

// ─── Cuerpo ─────────────────────────────────────────────────────────
export async function logBody(fd: FormData) {
  return mutate(({ supabase }) => {
    const fields = {
      weight_kg: optNumber(fd, "weight_kg"),
      chest_cm: optNumber(fd, "chest_cm"),
      waist_cm: optNumber(fd, "waist_cm"),
      arm_cm: optNumber(fd, "arm_cm"),
    };
    if (Object.values(fields).every((v) => v === null)) return invalid("Apunta al menos un dato");
    return supabase.from("body_metrics").insert({ day: text(fd, "day") || todayISO(), ...fields });
  });
}

export async function addPhoto(fd: FormData) {
  return mutate(({ supabase, userId }) => {
    const file = uploadedFile(fd, userId);
    if (!file) return invalid("Elige una foto");
    return supabase.from("progress_photos").insert({
      day: text(fd, "day") || todayISO(),
      angle: oneOf(fd, "angle", keysOf(PHOTO_ANGLES), "frente"),
      storage_path: file.path,
    });
  });
}

export async function deletePhoto(id: string) {
  return mutate(async ({ supabase }) => {
    await removeRowFile(supabase, "progress_photos", id, "storage_path");
    return supabase.from("progress_photos").delete().eq("id", id);
  });
}
