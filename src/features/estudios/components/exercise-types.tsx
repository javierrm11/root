import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { CopyButton } from "@/components/ui/copy-button";
import { Icon } from "@/components/ui/icon";
import { InlineAdd } from "@/components/ui/inline-add";
import { Chip } from "@/components/ui/primitives";
import { EXERCISE_STATUS } from "@/lib/constants";
import type { ExerciseType } from "@/lib/types";
import { addExerciseType, setMastery } from "../actions";
import { detectExerciseTypes } from "../ai";
import { CLAUDE_PROMPTS, MAX_MASTERY, suggestedMastery } from "../logic";
import { AiButton } from "./ai-button";

/** Detalle bajo el nombre de un tipo: cuántos hay en el boletín, cuáles y si tiene guía. */
export const exerciseTypeMeta = (t: ExerciseType) =>
  [t.count !== null ? `${t.count} en el boletín` : null, t.examples, t.guide ? "con guía" : null].filter(Boolean).join(" · ");

/**
 * Tipos de ejercicio de un tema (método de estudio): los separa Claude leyendo el boletín
 * (o Gemini, si está activado), y cada uno lleva a su guía y sus tandas de práctica.
 */
export function ExerciseTypes({
  topic,
  subjectName,
  gemini,
}: {
  topic: { id: string; title: string; mastery: number; exerciseTypes: ExerciseType[] };
  subjectName: string;
  gemini: boolean;
}) {
  const types = topic.exerciseTypes;
  const suggested = suggestedMastery(types.map((t) => t.status));
  const dominated = types.filter((t) => t.status === "dominado").length;

  return (
    <>
      {types.length > 0 ? (
        <div className="divide-y divide-line rounded-xl border border-line">
          {types.map((t) => (
            <Link key={t.id} href={`/estudios/ejercicio/${t.id}`} className="flex min-h-13 items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t.name}</span>
                {exerciseTypeMeta(t) && <span className="block truncate text-[13px] text-muted">{exerciseTypeMeta(t)}</span>}
              </span>
              <Chip tone={EXERCISE_STATUS[t.status].tone}>{EXERCISE_STATUS[t.status].label}</Chip>
              <Icon name="chevron-right" size={16} className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted">
          Pídele a Claude que lea el boletín y separe los ejercicios por tipos: luego cada tipo tiene su guía y sus tandas.
        </p>
      )}

      {suggested !== null && (
        <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
          <span>
            {dominated}/{types.length} tipos dominados · dominio sugerido {suggested}/{MAX_MASTERY}
          </span>
          {suggested !== topic.mastery && (
            <ActionButton action={setMastery.bind(null, topic.id, suggested)} className="min-h-9 font-semibold text-acc">
              Aplicar
            </ActionButton>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <CopyButton
          value={CLAUDE_PROMPTS.types({ subject: subjectName, topic: topic.title, topicId: topic.id })}
          label={types.length ? "Pedir más a Claude" : "Pedir a Claude"}
        />
        {gemini && (
          <AiButton action={detectExerciseTypes.bind(null, topic.id)}>{types.length ? "Revisar con Gemini" : "Detectar con Gemini"}</AiButton>
        )}
      </div>
      <InlineAdd action={addExerciseType.bind(null, topic.id)} name="name" placeholder="Añadir tipo a mano…" />
    </>
  );
}
