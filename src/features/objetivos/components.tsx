import Link from "next/link";
import { Field, FieldRow, Input, Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/primitives";
import { GOAL_METRICS, toOptions } from "@/lib/constants";
import { addDays, addMonths, periodStart } from "@/lib/dates";
import type { Goal } from "@/lib/types";
import type { GoalWithValue } from "./queries";

type Named = { id: string; name: string };

const formatValue = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function GoalFields({ goal, subjects, exercises, today }: { goal?: Goal; subjects: Named[]; exercises: Named[]; today: string }) {
  const quarter = periodStart(today, "trimestre");
  return (
    <>
      <Field label="Objetivo">
        <Input name="title" required defaultValue={goal?.title} placeholder="Aprobar el parcial de Programación" />
      </Field>
      <Field label="Cómo se mide">
        <Select name="metric" defaultValue={goal?.metric ?? "manual"} options={toOptions(GOAL_METRICS)} />
      </Field>
      <Field label="Asignatura o ejercicio" hint="Solo para dominio de una asignatura o récord de un ejercicio">
        <Select
          name="ref_id"
          defaultValue={goal?.ref_id ?? ""}
          placeholder="—"
          options={[
            ...subjects.map((s) => ({ value: s.id, label: `Asignatura · ${s.name}` })),
            ...exercises.map((e) => ({ value: e.id, label: `Ejercicio · ${e.name}` })),
          ]}
        />
      </Field>
      <FieldRow>
        <Field label="Meta">
          <Input name="target" type="number" inputMode="decimal" step="any" min={0} required defaultValue={goal?.target ?? ""} placeholder="100" />
        </Field>
        <Field label="Valor actual" hint="Solo si es manual">
          <Input name="manual_value" type="number" inputMode="decimal" step="any" defaultValue={goal?.manual_value ?? 0} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Desde">
          <Input name="start_date" type="date" required defaultValue={goal?.start_date ?? quarter} />
        </Field>
        <Field label="Hasta">
          <Input name="end_date" type="date" required defaultValue={goal?.end_date ?? addDays(addMonths(quarter, 3), -1)} />
        </Field>
      </FieldRow>
    </>
  );
}

/** Objetivo con su barra de progreso (en Objetivos y en Hoy). */
export function GoalProgress({ goal }: { goal: GoalWithValue }) {
  const tone = GOAL_METRICS[goal.metric].tone;
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <Link href="/objetivos" className="text-sm font-semibold">
          {goal.title}
        </Link>
        <span className="shrink-0 font-mono text-[13px] text-muted">
          {formatValue(goal.value)} / {formatValue(Number(goal.target))} {goal.unit}
        </span>
      </div>
      <ProgressBar value={goal.pct} tone={tone} />
    </div>
  );
}
