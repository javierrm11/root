"use client";

import { useMemo, useState, useTransition } from "react";
import { createEmptyCard, fsrs, Rating, type CardInput, type Grade } from "ts-fsrs";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/constants";
import type { Flashcard } from "@/lib/types";
import { reviewFlashcard } from "../actions";

const scheduler = fsrs();

const GRADES: Array<{ grade: Grade; label: string; tone: Tone }> = [
  { grade: Rating.Again, label: "Otra vez", tone: "content" },
  { grade: Rating.Hard, label: "Difícil", tone: "work" },
  { grade: Rating.Good, label: "Bien", tone: "gym" },
  { grade: Rating.Easy, label: "Fácil", tone: "study" },
];

function formatInterval(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

/** Sesión de repaso: girar, puntuar y pasar a la siguiente. */
export function Review({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const card = cards[index];

  // Intervalo que tendría la tarjeta con cada respuesta.
  const intervals = useMemo(() => {
    if (!card) return {} as Record<Grade, string>;
    const now = new Date();
    const preview = scheduler.repeat((card.fsrs as CardInput | null) ?? createEmptyCard(now), now);
    return Object.fromEntries(
      GRADES.map(({ grade }) => [grade, formatInterval(preview[grade].card.due.getTime() - now.getTime())]),
    ) as Record<Grade, string>;
  }, [card]);

  if (!card) {
    return (
      <EmptyState icon="check" title="¡Al día!">
        <p className="mb-4">No te quedan tarjetas por repasar en esta asignatura.</p>
        <ButtonLink href="/estudios/flashcards" variant="ghost">
          Volver a las barajas
        </ButtonLink>
      </EmptyState>
    );
  }

  const rate = (grade: Grade) =>
    startTransition(async () => {
      const result = await reviewFlashcard(card.id, grade);
      if (result?.error) return window.alert(result.error);
      setFlipped(false);
      setIndex((i) => i + 1);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-[13px] text-muted">
        <span>
          Tarjeta {index + 1} de {cards.length}
        </span>
        <span className="font-mono">FSRS</span>
      </div>
      <ProgressBar value={((index + 1) / cards.length) * 100} />

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label="Girar tarjeta"
        className={cn(
          "mt-2 flex min-h-[260px] w-full flex-col justify-center gap-3.5 rounded-2xl border px-6 py-7 text-left",
          flipped ? "border-accent/40 bg-accent/10" : "border-line bg-surface",
        )}
      >
        <span className="section-title text-acc">{flipped ? "Respuesta" : "Pregunta"}</span>
        <span className={cn("whitespace-pre-line", flipped ? "text-[17px] leading-relaxed font-medium" : "text-[22px] leading-snug font-semibold")}>
          {flipped ? card.back : card.front}
        </span>
        <span className="text-[13px] text-muted">{flipped ? "¿Qué tal te la sabías?" : "Toca para ver la respuesta"}</span>
      </button>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ grade, label, tone }) => (
            <button
              key={grade}
              type="button"
              disabled={pending}
              onClick={() => rate(grade)}
              className={cn("tinted flex flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 disabled:opacity-50", `tone-${tone}`)}
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-muted">{intervals[grade]}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setFlipped(true)} className="h-11 rounded-xl bg-accent font-semibold text-ink">
          Mostrar respuesta
        </button>
      )}
    </div>
  );
}
