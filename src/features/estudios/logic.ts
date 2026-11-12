// Reglas de estudio, puras y sin dependencias de servidor.
import type { FileStatus, Tone } from "@/lib/constants";
import { addDays, daysBetween, formatDay } from "@/lib/dates";

export const MAX_MASTERY = 5;

// Supuestos para recomendar cuándo empezar a estudiar un examen.
const HOURS_PER_MASTERY_LEVEL = 1.5; // horas para subir un nivel de dominio en un tema
const STUDY_HOURS_PER_DAY = 2;
const REVIEW_DAYS = 2; // días finales reservados para repasar

/** % de dominio de una asignatura a partir del dominio (0–5) de sus temas. */
export function masteryPct(masteries: number[]) {
  if (!masteries.length) return 0;
  const total = masteries.reduce((sum, m) => sum + m, 0);
  return Math.round((total / (masteries.length * MAX_MASTERY)) * 100);
}

/** Estado de un tema para priorizar: qué atacar primero. */
export function topicStatus(mastery: number, hasFiles: boolean): { label: string; tone: Tone } {
  if (mastery >= 4) return { label: "Dominado", tone: "gym" };
  if (mastery >= 2) return { label: "Repasar", tone: "work" };
  if (!hasFiles && mastery === 0) return { label: "Sin empezar", tone: "mut" };
  return { label: "Prioridad", tone: "acc" };
}

/** Días de estudio necesarios según lo que falta por dominar. */
export function studyDaysNeeded(masteries: number[]) {
  const hours = masteries.reduce((sum, m) => sum + (MAX_MASTERY - m) * HOURS_PER_MASTERY_LEVEL, 0);
  if (hours === 0) return 0;
  return Math.ceil(hours / STUDY_HOURS_PER_DAY) + REVIEW_DAYS;
}

/** Consejo de cuándo empezar a preparar un examen. */
export function startAdvice(today: string, examDate: string, masteries: number[]) {
  if (!masteries.length) return "Añade los temas para calcular cuándo empezar";
  const needed = studyDaysNeeded(masteries);
  if (needed === 0) return "Lo tienes dominado: solo repasa";
  const start = addDays(examDate, -needed);
  const margin = daysBetween(today, start);
  if (margin > 0) return `Empieza antes del ${formatDay(start)} · ${needed} días de estudio`;
  if (margin === 0) return `Empieza hoy · ${needed} días de estudio`;
  return `Vas con retraso: necesitas ${needed} días y quedan ${Math.max(0, daysBetween(today, examDate))}`;
}

/** Cuanto más alto, más urgente estudiar ese tema hoy. */
export function priorityScore(mastery: number, daysToExam: number) {
  return (MAX_MASTERY - mastery) / Math.max(1, daysToExam);
}

/** Siguiente estado de un boletín al tocar su etiqueta. */
export const NEXT_FILE_STATUS: Record<FileStatus, FileStatus> = {
  pendiente: "en_curso",
  en_curso: "hecho",
  hecho: "pendiente",
};

/** Iniciales para la portada cuando no hay símbolo. */
export const subjectInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || name.slice(0, 2).toUpperCase();
