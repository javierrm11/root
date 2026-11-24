// Reglas de estudio, puras y sin dependencias de servidor.
import type { ExerciseStatus, FileStatus, PracticeMode, Tone } from "@/lib/constants";
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

/** Archivos de los que se puede sacar texto para Claude: PDF e imágenes. */
export const isReadable = (mime: string | null) => mime === "application/pdf" || Boolean(mime?.startsWith("image/"));

/** Siguiente estado de un boletín al tocar su etiqueta. */
export const NEXT_FILE_STATUS: Record<FileStatus, FileStatus> = {
  pendiente: "en_curso",
  en_curso: "hecho",
  hecho: "pendiente",
};

// ─── Práctica por tipos de ejercicio ────────────────────────────────

/** Aciertos necesarios en una tanda para dar un tipo de ejercicio por dominado. */
export const PASS_RATIO = 0.8;
/** Ejercicios por tanda que se piden a Claude o a Gemini. */
export const PRACTICE_SIZE = 5;

export const passed = (correct: number, total: number) => total > 0 && correct / total >= PASS_RATIO;

/** Dominio del tema (0–5) que sugieren sus tipos de ejercicio dominados. */
export function suggestedMastery(statuses: ExerciseStatus[]) {
  if (!statuses.length) return null;
  return Math.round((statuses.filter((s) => s === "dominado").length / statuses.length) * MAX_MASTERY);
}

/** Siguiente tipo por practicar del tema (en orden), sin contar el actual. */
export function nextExerciseType<T extends { id: string; status: ExerciseStatus }>(types: T[], currentId: string) {
  const index = types.findIndex((t) => t.id === currentId);
  const ordered = [...types.slice(index + 1), ...types.slice(0, Math.max(0, index))];
  return ordered.find((t) => t.status !== "dominado") ?? null;
}

// Textos para copiar y pegar en Claude: le dicen qué herramientas del MCP de root usar.
type PromptCtx = { subject: string; topic: string; topicId: string };
type TypeCtx = PromptCtx & { typeId: string; typeName: string };

export const CLAUDE_PROMPTS = {
  plan: () =>
    "Con root: mira mis asignaturas, temas, dominio, tipos de ejercicio y exámenes (y ver_calendario para ver lo que ya tengo), y hazme un plan día a día hasta cada examen, sin horas. Cada día: qué tema estudiar, qué ejercicios del boletín hacer y qué repasar, con un simulacro antes de cada examen y días de repaso al final. Guárdalo con crear_plan_estudio.",
  types: (c: PromptCtx) =>
    `Con root: lee los boletines del tema «${c.topic}» de ${c.subject} (topic_id ${c.topicId}) con leer_archivo y dime cuántos tipos de ejercicio hay y cuáles (con los números de ejercicio de cada uno). Después guárdalos con guardar_tipos_ejercicio.`,
  guide: (c: TypeCtx) =>
    `Con root: explícame cómo resolver los ejercicios de tipo «${c.typeName}» del tema «${c.topic}» de ${c.subject} (exercise_type_id ${c.typeId}). Lee la teoría y el boletín con leer_archivo. Quiero un poco de teoría, los pasos para resolverlo y un ejemplo resuelto. Guárdalo con guardar_guia.`,
  practice: (c: TypeCtx, mode: PracticeMode) =>
    `Con root: hazme una tanda de ${PRACTICE_SIZE} ejercicios ${mode === "test" ? "tipo test" : "de desarrollo"} del tipo «${c.typeName}» del tema «${c.topic}» de ${c.subject} (exercise_type_id ${c.typeId}), con pista y solución paso a paso. Mira antes resultados_practica para centrarte en lo que he fallado y guárdala con crear_practica.`,
};

// ─── Plan de exámenes ───────────────────────────────────────────────

/** Días que se reparten las tareas atrasadas de una asignatura sin examen. */
const RESCHEDULE_WINDOW = 7;

/**
 * Reparte las tareas atrasadas entre hoy y el día antes del examen de su asignatura
 * (o la próxima semana si no hay examen), poniendo cada una en el día con menos carga.
 */
export function rescheduleOverdue(
  overdue: Array<{ id: string; subject_id: string | null }>,
  load: Map<string, number>,
  examBySubject: Map<string, string>,
  today: string,
) {
  const moves: Array<{ id: string; day: string }> = [];
  for (const task of overdue) {
    const exam = task.subject_id ? examBySubject.get(task.subject_id) : undefined;
    let last = exam ? addDays(exam, -1) : addDays(today, RESCHEDULE_WINDOW - 1);
    if (last < today) last = today;
    let best = today;
    for (let day = today; day <= last; day = addDays(day, 1)) {
      if ((load.get(day) ?? 0) < (load.get(best) ?? 0)) best = day;
    }
    load.set(best, (load.get(best) ?? 0) + 1);
    moves.push({ id: task.id, day: best });
  }
  return moves;
}
