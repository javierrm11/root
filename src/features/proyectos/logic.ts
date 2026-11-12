// Reglas del módulo freelance, puras (se usan en servidor y en el cliente).
import { IDEA_CRITERIA, type FeatureColumn, type IdeaCriterion, type InvoiceStatus } from "@/lib/constants";

const TOTAL_WEIGHT = IDEA_CRITERIA.reduce((total, c) => total + c.weight, 0);

/** Nota de una idea (1–10) como media ponderada de sus 7 criterios. */
export function ideaScore(values: Record<IdeaCriterion, number>) {
  const weighted = IDEA_CRITERIA.reduce((total, c) => total + values[c.key] * c.weight, 0);
  return Math.round((weighted / TOTAL_WEIGHT) * 10) / 10;
}

export const formatScore = (score: number) =>
  score.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Los criterios donde mejor puntúa la idea. */
export function strongestCriteria(values: Record<IdeaCriterion, number>, count = 2) {
  return [...IDEA_CRITERIA]
    .sort((a, b) => values[b.key] * b.weight - values[a.key] * a.weight)
    .slice(0, count)
    .map((c) => c.label.toLowerCase());
}

/** Columna siguiente de una feature (null si ya está hecha). */
export const NEXT_COLUMN: Record<FeatureColumn, FeatureColumn | null> = {
  idea: "todo",
  todo: "doing",
  doing: "done",
  done: null,
};

export const NEXT_INVOICE_STATUS: Record<InvoiceStatus, InvoiceStatus> = {
  emitida: "cobrada",
  cobrada: "vencida",
  vencida: "emitida",
};

/** Ingresos de un proyecto para el €/hora: lo facturado o, si aún no hay facturas, el presupuesto. */
export const projectIncome = (invoiced: number, budget: number | null) => (invoiced > 0 ? invoiced : Number(budget ?? 0));
