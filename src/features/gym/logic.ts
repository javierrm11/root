// Reglas del gym, puras.
import type { WorkoutSet } from "@/lib/types";

/** 1RM estimado (fórmula de Epley). */
export const estimatedMax = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

/** Primer número de "6-8" o "8"; "fallo" → null. */
export const repsTarget = (reps: string) => {
  const n = parseInt(reps, 10);
  return Number.isFinite(n) ? n : null;
};

export const formatKg = (kg: number) => `${kg.toLocaleString("es-ES", { maximumFractionDigits: 1 })} kg`;

/** "82,5 × 6" o "PC × 12" (peso corporal). */
export const formatSet = (set: Pick<WorkoutSet, "weight_kg" | "reps">) =>
  `${set.weight_kg ? Number(set.weight_kg).toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "PC"} × ${set.reps ?? "–"}`;

/** Mejor serie hecha (por 1RM estimado) de una lista. */
export function bestSet(sets: WorkoutSet[]) {
  let best: { set: WorkoutSet; max: number } | null = null;
  for (const set of sets) {
    if (!set.done || !set.weight_kg || !set.reps) continue;
    const max = estimatedMax(Number(set.weight_kg), set.reps);
    if (!best || max > best.max) best = { set, max };
  }
  return best;
}
