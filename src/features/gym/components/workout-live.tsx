"use client";

import { useState, useTransition } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { WorkoutSet } from "@/lib/types";
import { addSet, saveSet } from "../actions";

type LiveSet = WorkoutSet & { prev: string };
type LiveExercise = { exerciseId: string; name: string; sets: LiveSet[] };
type SetState = { weight: string; reps: string; done: boolean };

const toNumber = (value: string) => {
  const n = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(n) ? n : null;
};

/** Modo entreno: cada serie se guarda al marcarla o al salir del campo. */
export function WorkoutLive({ workoutId, exercises }: { workoutId: string; exercises: LiveExercise[] }) {
  // Solo guarda lo editado aquí; las series nuevas (al añadir una) se leen de las props.
  const [edits, setEdits] = useState<Record<string, SetState>>({});
  const [, startTransition] = useTransition();
  const current = (set: LiveSet): SetState =>
    edits[set.id] ?? { weight: set.weight_kg?.toString() ?? "", reps: set.reps?.toString() ?? "", done: set.done };
  const all = exercises.flatMap((e) => e.sets).map(current);
  const done = all.filter((s) => s.done).length;

  const persist = (id: string, next: SetState) =>
    startTransition(async () => {
      await saveSet(id, toNumber(next.weight), toNumber(next.reps), next.done);
    });

  const update = (set: LiveSet, patch: Partial<SetState>, save = false) => {
    const next = { ...current(set), ...patch };
    setEdits((e) => ({ ...e, [set.id]: next }));
    if (save) persist(set.id, next);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent/8 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {done} de {all.length} series
          </span>
          <span className="font-mono text-sm text-acc">{all.length ? Math.round((done / all.length) * 100) : 0} %</span>
        </div>
        <ProgressBar value={all.length ? (done / all.length) * 100 : 0} />
      </div>

      {exercises.map((exercise) => (
        <section key={exercise.exerciseId} className="border-t border-line py-4 first:border-t-0">
          <h2 className="mb-2 text-[15px] font-semibold">{exercise.name}</h2>
          <div className="grid grid-cols-[28px_minmax(0,1fr)_64px_52px_40px] items-center gap-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <span>Serie</span>
            <span>Anterior</span>
            <span>Kg</span>
            <span>Reps</span>
            <span />
          </div>
          {exercise.sets.map((set) => {
            const s = current(set);
            return (
              <div key={set.id} className="grid min-h-12 grid-cols-[28px_minmax(0,1fr)_64px_52px_40px] items-center gap-2 border-t border-line">
                <span className="font-mono text-[13px] text-muted">{set.set_no}</span>
                <span className="font-mono text-[13px] text-muted">{set.prev}</span>
                <input
                  aria-label={`Kilos, serie ${set.set_no}`}
                  inputMode="decimal"
                  value={s.weight}
                  onChange={(e) => update(set, { weight: e.target.value })}
                  onBlur={() => persist(set.id, s)}
                  className={cn("h-9 w-full rounded-lg bg-surface-2 px-2 text-center font-mono text-base outline-none focus:ring-2 focus:ring-acc", s.done && "text-muted")}
                />
                <input
                  aria-label={`Repeticiones, serie ${set.set_no}`}
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => update(set, { reps: e.target.value })}
                  onBlur={() => persist(set.id, s)}
                  className={cn("h-9 w-full rounded-lg bg-surface-2 px-2 text-center font-mono text-base outline-none focus:ring-2 focus:ring-acc", s.done && "text-muted")}
                />
                <button
                  type="button"
                  aria-label={`Marcar serie ${set.set_no}`}
                  aria-pressed={s.done}
                  onClick={() => update(set, { done: !s.done }, true)}
                  className={cn(
                    "grid size-9 place-items-center rounded-[10px] border-[1.5px]",
                    s.done ? "border-accent bg-accent text-ink" : "border-line text-transparent",
                  )}
                >
                  <Icon name="check" size={16} />
                </button>
              </div>
            );
          })}
          <ActionButton action={() => addSet(workoutId, exercise.exerciseId)} className="mt-2 text-[13px] font-semibold text-acc">
            + Añadir serie
          </ActionButton>
        </section>
      ))}
    </div>
  );
}
