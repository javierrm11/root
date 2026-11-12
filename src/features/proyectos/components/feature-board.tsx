"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { FEATURE_COLUMNS, LEVELS, keysOf, type FeatureColumn } from "@/lib/constants";
import type { ProjectFeature } from "@/lib/types";
import { deleteRow } from "@/features/common/actions";
import { moveFeature } from "../actions";
import { NEXT_COLUMN } from "../logic";

/** Tablero de features en el móvil: cada columna es una pestaña; la flecha la pasa a la siguiente. */
export function FeatureBoard({ features }: { features: ProjectFeature[] }) {
  const [column, setColumn] = useState<FeatureColumn>(() => (features.some((f) => f.col === "doing") ? "doing" : "todo"));
  const visible = features.filter((f) => f.col === column);

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]" role="tablist" aria-label="Columnas">
        {keysOf(FEATURE_COLUMNS).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={column === key}
            onClick={() => setColumn(key)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-semibold",
              column === key ? "bg-fg text-bg" : "bg-surface-2 text-muted",
            )}
          >
            {FEATURE_COLUMNS[key].label}
            <span className="font-mono opacity-70">{features.filter((f) => f.col === key).length}</span>
          </button>
        ))}
      </div>

      <div className="divide-y divide-line">
        {visible.map((feature) => {
          const next = NEXT_COLUMN[feature.col];
          return (
            <div key={feature.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{feature.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip tone={LEVELS[feature.impact].tone}>Impacto {LEVELS[feature.impact].label.toLowerCase()}</Chip>
                  <Chip tone="mut">Esfuerzo {LEVELS[feature.effort].label.toLowerCase()}</Chip>
                </div>
              </div>
              {next && (
                <ActionButton
                  action={() => moveFeature(feature.id, next)}
                  label={`Mover a ${FEATURE_COLUMNS[next].label}`}
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-line"
                >
                  <Icon name="chevron-right" size={16} />
                </ActionButton>
              )}
              <ActionButton
                action={() => deleteRow("project_features", feature.id)}
                confirm={`¿Borrar «${feature.title}»?`}
                label="Borrar feature"
                className="grid size-9 shrink-0 place-items-center text-muted"
              >
                <Icon name="trash" size={15} />
              </ActionButton>
            </div>
          );
        })}
      </div>
      {!visible.length && <p className="py-2 text-sm text-muted">Nada en esta columna.</p>}
    </div>
  );
}
