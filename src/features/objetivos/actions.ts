"use server";

import { invalid, mutate, upsert } from "@/lib/actions";
import { GOAL_METRICS, keysOf } from "@/lib/constants";
import { oneOf, optNumber, optText, text } from "@/lib/form";

const NEEDS_REF = ["subject_mastery", "exercise_record"];

export async function saveGoal(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const title = text(fd, "title");
    const target = optNumber(fd, "target");
    const metric = oneOf(fd, "metric", keysOf(GOAL_METRICS), "manual");
    const refId = optText(fd, "ref_id");
    const start = text(fd, "start_date");
    const end = text(fd, "end_date");
    if (!title || !target || target <= 0) return invalid("Pon un título y una meta mayor que 0");
    if (NEEDS_REF.includes(metric) && !refId) return invalid("Elige la asignatura o el ejercicio");
    if (!start || !end || end < start) return invalid("Revisa las fechas");
    return upsert(supabase, "goals", id, {
      title,
      metric,
      target,
      ref_id: NEEDS_REF.includes(metric) ? refId : null,
      manual_value: optNumber(fd, "manual_value") ?? 0,
      start_date: start,
      end_date: end,
    });
  });
}

/** Actualiza el valor de un objetivo manual. */
export async function setGoalValue(id: string, fd: FormData) {
  return mutate(({ supabase }) => {
    const value = optNumber(fd, "value");
    if (value === null) return invalid("Escribe un número");
    return supabase.from("goals").update({ manual_value: value }).eq("id", id);
  });
}
