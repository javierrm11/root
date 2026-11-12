"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IDEA_CRITERIA, type IdeaCriterion } from "@/lib/constants";
import type { Idea } from "@/lib/types";
import { formatScore, ideaScore } from "../logic";

type Scores = Record<IdeaCriterion, number>;

const initialScores = (idea?: Idea) =>
  Object.fromEntries(IDEA_CRITERIA.map((c) => [c.key, idea?.[c.key] ?? 5])) as Scores;

/** Idea con sus 7 criterios en deslizadores y la nota recalculada en vivo. */
export function IdeaFields({ idea }: { idea?: Idea }) {
  const [scores, setScores] = useState(() => initialScores(idea));

  return (
    <>
      <Field label="La idea">
        <Input name="title" required defaultValue={idea?.title} placeholder="App de…" />
      </Field>
      <Field label="Descripción">
        <Textarea name="description" defaultValue={idea?.description ?? ""} className="min-h-20" />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-3">
        <span className="text-sm font-semibold">Puntuación</span>
        <span className="font-mono text-[22px] leading-none font-bold text-acc">{formatScore(ideaScore(scores))}</span>
      </div>
      {IDEA_CRITERIA.map((c) => (
        <label key={c.key} className="grid grid-cols-[minmax(0,1fr)_110px_22px] items-center gap-2.5">
          <span>
            <span className="block text-sm font-semibold">{c.label}</span>
            <span className="block text-xs text-muted">{c.weight === 3 ? "Peso alto" : "Peso medio"}</span>
          </span>
          <input
            type="range"
            name={c.key}
            min={1}
            max={10}
            step={1}
            value={scores[c.key]}
            onChange={(e) => setScores((s) => ({ ...s, [c.key]: Number(e.target.value) }))}
            className="w-full accent-[var(--accent)]"
          />
          <span className="font-mono text-sm">{scores[c.key]}</span>
        </label>
      ))}
    </>
  );
}
