"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { PracticeMode } from "@/lib/constants";
import { answerPracticeItem, finishPractice } from "../actions";
import { PASS_RATIO, passed } from "../logic";

/** Ejercicio con el Markdown ya pintado en el servidor. */
export type LiveItem = {
  id: string;
  question: ReactNode;
  options: ReactNode[] | null;
  correctOption: number | null;
  /** Resultado final (solo desarrollo). */
  answer: ReactNode | null;
  hint: ReactNode | null;
  solution: ReactNode;
  chosen: number | null;
  correct: boolean | null;
};

type Answer = { chosen: number | null; correct: boolean };

/**
 * Tanda de práctica: un ejercicio por pantalla, pista y solución ocultas hasta pulsar,
 * y al acabar el resultado con lo siguiente que toca (`outcome`, pintado en el servidor).
 * Cada respuesta se guarda al momento, sin refrescar la pantalla.
 */
export function PracticeLive({
  setId,
  mode,
  items,
  finished,
  outcome,
}: {
  setId: string;
  mode: PracticeMode;
  items: LiveItem[];
  finished: boolean;
  outcome: { pass: ReactNode; fail: ReactNode };
}) {
  const [edits, setEdits] = useState<Record<string, Answer>>({});
  const answerOf = (item: LiveItem): Answer | null => edits[item.id] ?? (item.correct === null ? null : { chosen: item.chosen, correct: item.correct });

  const firstOpen = items.findIndex((i) => i.correct === null);
  const [index, setIndex] = useState(Math.max(0, firstOpen));
  const [summary, setSummary] = useState(finished || firstOpen === -1);
  const [shown, setShown] = useState<Record<string, { hint?: boolean; solution?: boolean }>>({});
  const [pending, startTransition] = useTransition();

  const item = items[index];
  const current = answerOf(item);
  const answered = items.filter((i) => answerOf(i)).length;
  const correct = items.filter((i) => answerOf(i)?.correct).length;
  const toggle = (key: "hint" | "solution") => setShown((s) => ({ ...s, [item.id]: { ...s[item.id], [key]: !s[item.id]?.[key] } }));

  function answer(value: Answer) {
    setEdits((e) => ({ ...e, [item.id]: value }));
    startTransition(async () => {
      const result = await answerPracticeItem(item.id, value.chosen, value.correct);
      if (result?.error) window.alert(result.error);
    });
  }

  function finish() {
    startTransition(async () => {
      const result = await finishPractice(setId);
      if (result?.error) return window.alert(result.error);
      setSummary(true);
    });
  }

  if (summary) {
    const ok = passed(correct, items.length);
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-3">
          <span className={cn("text-[56px] leading-none font-bold tracking-[-0.04em]", ok ? "text-gym" : "text-work")}>
            {correct}/{items.length}
          </span>
          <span className="pb-1.5 text-[15px] text-muted">{ok ? "¡Dominado!" : `Necesitas ${Math.ceil(items.length * PASS_RATIO)} para dominarlo`}</span>
        </div>
        <div className="flex flex-col gap-2">{ok ? outcome.pass : outcome.fail}</div>

        <div>
          <h2 className="section-title mb-1">Repasar</h2>
          <div className="divide-y divide-line">
            {items.map((it, i) => {
              const a = answerOf(it);
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setSummary(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 text-left"
                >
                  <span className={cn("tinted grid size-7 shrink-0 place-items-center rounded-full", a?.correct ? "tone-gym" : a ? "tone-content" : "tone-mut")}>
                    <Icon name={a?.correct ? "check" : "x"} size={14} />
                  </span>
                  <span className="flex-1 text-sm font-semibold">Ejercicio {i + 1}</span>
                  <Icon name="chevron-right" size={16} className="text-muted" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const isLast = index === items.length - 1;
  const missing = items.length - answered;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="flex justify-between text-[13px] font-semibold text-muted">
          <span>
            Ejercicio {index + 1} de {items.length}
          </span>
          <span>{answered} respondidos</span>
        </span>
        <ProgressBar value={(answered / items.length) * 100} />
      </div>

      <div className="rounded-2xl bg-surface p-4">{item.question}</div>

      {mode === "test" && item.options && (
        <div className="flex flex-col gap-2">
          {item.options.map((option, i) => {
            const isCorrect = i === item.correctOption;
            const isChosen = current?.chosen === i;
            return (
              <button
                key={i}
                type="button"
                disabled={Boolean(current)}
                onClick={() => answer({ chosen: i, correct: isCorrect })}
                className={cn(
                  "flex min-h-12 items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-default",
                  !current && "border-line active:bg-surface-2",
                  current && isCorrect && "tinted tone-gym border-transparent",
                  current && isChosen && !isCorrect && "tinted tone-content border-transparent",
                  current && !isCorrect && !isChosen && "border-line opacity-60",
                )}
              >
                <span className="mt-0.5 font-mono text-[13px] font-bold">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 flex-1 text-fg [&_.md]:text-[15px]">{option}</span>
                {current && isCorrect && <Icon name="check" size={18} />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {item.hint && (
          <Button variant="small" icon="lightbulb" onClick={() => toggle("hint")} aria-expanded={Boolean(shown[item.id]?.hint)}>
            {shown[item.id]?.hint ? "Ocultar pista" : "Pista"}
          </Button>
        )}
        <Button variant="small" icon="book" onClick={() => toggle("solution")} aria-expanded={Boolean(shown[item.id]?.solution)}>
          {shown[item.id]?.solution ? "Ocultar solución" : "Solución"}
        </Button>
      </div>
      {item.hint && shown[item.id]?.hint && <div className="tinted tone-work rounded-xl p-3.5 text-fg">{item.hint}</div>}
      {shown[item.id]?.solution && (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
          {item.answer && (
            <div className="flex items-baseline gap-2">
              <span className="section-title">Resultado</span>
              {item.answer}
            </div>
          )}
          {item.solution}
        </div>
      )}

      {mode === "desarrollo" && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant={current?.correct === true ? "primary" : "outline"} onClick={() => answer({ chosen: null, correct: true })} aria-pressed={current?.correct === true}>
            Me ha salido
          </Button>
          <Button variant={current?.correct === false ? "primary" : "outline"} onClick={() => answer({ chosen: null, correct: false })} aria-pressed={current?.correct === false}>
            No me ha salido
          </Button>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <Button variant="ghost" icon="chevron-left" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Anterior
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={pending || missing > 0}>
            {missing > 0 ? `Te faltan ${missing}` : "Terminar"}
          </Button>
        ) : (
          <Button variant={current ? "primary" : "ghost"} onClick={() => setIndex(index + 1)}>
            Siguiente
            <Icon name="chevron-right" size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
