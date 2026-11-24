"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { createEmptyCard, fsrs, type CardInput, type Grade } from "ts-fsrs";
import { invalid, mutate, upsert } from "@/lib/actions";
import {
  EDUCATION_KINDS,
  EDUCATION_LEVELS,
  EXAM_KINDS,
  EXERCISE_STATUS,
  FILE_KINDS,
  PRACTICE_MODES,
  STUDY_TASK_KINDS,
  keysOf,
  type ExerciseStatus,
  type FileStatus,
  type PracticeMode,
} from "@/lib/constants";
import { coverFields, oneOf, optInt, optNumber, optText, text, uploadedFile } from "@/lib/form";
import { removePaths, removeRowFile } from "@/lib/storage";
import type { Db } from "@/lib/supabase/server";
import { readFileText } from "./file-text";
import { NEXT_FILE_STATUS, isReadable, passed } from "./logic";
import { insertStudyTasks, rescheduleOverdueTasks, type StudyTaskInput } from "./plan";
import { insertPractice, upsertExerciseTypes, type ExerciseTypeInput, type PracticeItemInput } from "./practice";

const scheduler = fsrs();

/** Siguiente posición al final de una lista ordenada. */
async function nextPosition(table: string, column: string, value: string, supabase: Db) {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  return count ?? 0;
}

// ─── Asignaturas ────────────────────────────────────────────────────
function subjectFields(fd: FormData) {
  return {
    name: text(fd, "name"),
    code: optText(fd, "code"),
    description: optText(fd, "description"),
    course_year: optInt(fd, "course_year") ?? 1,
    semester: oneOf(fd, "semester", ["1", "2"], "1") === "2" ? 2 : 1,
    ...coverFields(fd),
  };
}

/** Crea (id = null) o edita una asignatura. La portada es opcional. */
export async function saveSubject(id: string | null, fd: FormData) {
  return mutate(async ({ supabase, userId }) => {
    const fields = subjectFields(fd);
    if (!fields.name) return invalid("Ponle un nombre a la asignatura");
    const cover = uploadedFile(fd, userId);
    if (id && cover) await removeRowFile(supabase, "subjects", id, "cover_path");
    return upsert(supabase, "subjects", id, { ...fields, ...(cover && { cover_path: cover.path }) });
  });
}

export async function deleteSubject(id: string) {
  const result = await mutate(async ({ supabase }) => {
    const [{ data: subject }, { data: files }] = await Promise.all([
      supabase.from("subjects").select("cover_path").eq("id", id).single(),
      supabase.from("study_files").select("storage_path").eq("subject_id", id),
    ]);
    await removePaths(supabase, [subject?.cover_path, ...(files ?? []).map((f) => f.storage_path)]);
    return supabase.from("subjects").delete().eq("id", id);
  });
  if (result?.error) return result;
  redirect("/estudios");
}

// ─── Temas y contenidos ─────────────────────────────────────────────
export async function addTopic(subjectId: string, fd: FormData) {
  return mutate(async ({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe el nombre del tema");
    const position = await nextPosition("topics", "subject_id", subjectId, supabase);
    return supabase.from("topics").insert({ subject_id: subjectId, title, position });
  });
}

/** Borra el tema y también sus archivos de Storage (las filas caen en cascada). */
export async function deleteTopic(id: string) {
  return mutate(async ({ supabase }) => {
    const { data: files } = await supabase.from("study_files").select("storage_path").eq("topic_id", id);
    await removePaths(supabase, (files ?? []).map((f) => f.storage_path));
    return supabase.from("topics").delete().eq("id", id);
  });
}

export async function setMastery(topicId: string, mastery: number) {
  return mutate(({ supabase }) =>
    supabase.from("topics").update({ mastery: Math.max(0, Math.min(5, mastery)) }).eq("id", topicId),
  );
}

export async function addContent(topicId: string, fd: FormData) {
  return mutate(async ({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe el contenido");
    const position = await nextPosition("topic_contents", "topic_id", topicId, supabase);
    return supabase.from("topic_contents").insert({ topic_id: topicId, title, position });
  });
}

// ─── Archivos (PDF de teoría, boletines, generales) ─────────────────
export async function addStudyFile(subjectId: string, topicId: string | null, fd: FormData) {
  return mutate(async ({ supabase, userId }) => {
    const file = uploadedFile(fd, userId);
    if (!file) return invalid("Elige un archivo");
    const kind = topicId ? oneOf(fd, "kind", keysOf(FILE_KINDS), "teoria") : "general";
    const { data: row, error } = await supabase
      .from("study_files")
      .insert({
        subject_id: subjectId,
        topic_id: topicId,
        kind,
        name: text(fd, "name") || file.name,
        storage_path: file.path,
        size_bytes: file.size,
        mime_type: file.mime,
        status: kind === "boletin" ? "pendiente" : null,
      })
      .select("id, storage_path, mime_type")
      .single();
    if (error) return { error };
    // El texto para Claude se saca después de responder, para no hacer esperar a la subida.
    if (isReadable(row.mime_type)) after(() => readFileText(supabase, row).then(() => undefined, console.error));
  });
}

/** Vuelve a sacar el texto de un archivo (si la lectura salió mal o el archivo es de antes). */
export async function rereadStudyFile(id: string) {
  return mutate(async ({ supabase }) => {
    const { data: file } = await supabase.from("study_files").select("id, storage_path, mime_type").eq("id", id).single();
    if (!file || !(await readFileText(supabase, file))) return invalid("No se ha podido leer el archivo");
  });
}

export async function cycleFileStatus(id: string, current: FileStatus) {
  return mutate(({ supabase }) => supabase.from("study_files").update({ status: NEXT_FILE_STATUS[current] }).eq("id", id));
}

export async function deleteStudyFile(id: string) {
  return mutate(async ({ supabase }) => {
    await removeRowFile(supabase, "study_files", id, "storage_path");
    return supabase.from("study_files").delete().eq("id", id);
  });
}

// ─── Práctica por tipos de ejercicio ────────────────────────────────
/** Guarda los tipos de ejercicio de un tema (los que detecta Claude o Gemini). Devuelve sus ids. */
export async function saveExerciseTypes(topicId: string, tipos: ExerciseTypeInput[]) {
  let saved: Awaited<ReturnType<typeof upsertExerciseTypes>> = [];
  const result = await mutate(async ({ supabase }) => {
    saved = await upsertExerciseTypes(supabase, topicId, tipos);
  });
  return result ?? { tipos: saved };
}

/** Añadir un tipo a mano, desde el tema. */
export async function addExerciseType(topicId: string, fd: FormData) {
  const nombre = text(fd, "name");
  if (!nombre) return { error: "Escribe el tipo de ejercicio" };
  const result = await saveExerciseTypes(topicId, [{ nombre }]);
  return "error" in result ? result : undefined;
}

export async function saveGuide(typeId: string, guide: string) {
  return mutate(({ supabase }) => {
    if (!guide.trim()) return invalid("La guía está vacía");
    return supabase.from("exercise_types").update({ guide, guide_at: new Date().toISOString() }).eq("id", typeId);
  });
}

export async function setExerciseStatus(typeId: string, status: ExerciseStatus) {
  if (!keysOf(EXERCISE_STATUS).includes(status)) return { error: "Estado no válido" };
  return mutate(({ supabase }) => supabase.from("exercise_types").update({ status }).eq("id", typeId));
}

/** Borra el tipo (con sus tandas) y vuelve a la asignatura. */
export async function deleteExerciseType(typeId: string) {
  let subjectId = "";
  const result = await mutate(async ({ supabase }) => {
    const { data } = await supabase.from("exercise_types").select("topics(subject_id)").eq("id", typeId).single();
    subjectId = (data?.topics as unknown as { subject_id: string } | null)?.subject_id ?? "";
    return supabase.from("exercise_types").delete().eq("id", typeId);
  });
  if (result?.error) return result;
  redirect(subjectId ? `/estudios/asignatura/${subjectId}` : "/estudios");
}

/** Crea una tanda de práctica (la usa Claude por MCP). Devuelve su id. */
export async function createPractice(typeId: string, mode: PracticeMode, items: PracticeItemInput[]) {
  if (!keysOf(PRACTICE_MODES).includes(mode)) return { error: "Modalidad no válida" };
  let id = "";
  const result = await mutate(async ({ supabase }) => {
    id = await insertPractice(supabase, typeId, mode, items);
  });
  return result ?? { id };
}

/** Guarda la respuesta de un ejercicio. No refresca para no cortar la tanda. */
export async function answerPracticeItem(itemId: string, chosenOption: number | null, correct: boolean) {
  return mutate(
    ({ supabase }) =>
      supabase
        .from("practice_items")
        .update({ chosen_option: chosenOption, correct, answered_at: new Date().toISOString() })
        .eq("id", itemId),
    { refreshRoute: false },
  );
}

/** Cierra la tanda: cuenta aciertos y, si llega al mínimo, da el tipo por dominado. */
export async function finishPractice(setId: string) {
  return mutate(
    async ({ supabase }) => {
      const [{ data: set }, { data: items }] = await Promise.all([
        supabase.from("practice_sets").select("exercise_type_id").eq("id", setId).single(),
        supabase.from("practice_items").select("correct").eq("set_id", setId),
      ]);
      if (!set) return invalid("Tanda no encontrada");
      const total = items?.length ?? 0;
      const correct = (items ?? []).filter((i) => i.correct).length;
      const { error } = await supabase
        .from("practice_sets")
        .update({ correct, total, finished_at: new Date().toISOString() })
        .eq("id", setId);
      if (error) return { error };
      return supabase
        .from("exercise_types")
        .update({ status: passed(correct, total) ? "dominado" : "practicando" })
        .eq("id", set.exercise_type_id);
    },
    { refreshRoute: false },
  );
}

// ─── Plan de exámenes ───────────────────────────────────────────────
export async function toggleStudyTask(id: string, done: boolean) {
  return mutate(({ supabase }) =>
    supabase.from("study_tasks").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id),
  );
}

/** Añadir una tarea al plan a mano. */
export async function addStudyTask(fd: FormData) {
  return mutate(async ({ supabase }) => {
    const title = text(fd, "title");
    const day = text(fd, "day");
    if (!title || !day) return invalid("Pon el día y qué hay que hacer");
    await insertStudyTasks(supabase, [
      {
        dia: day,
        titulo: title,
        tipo: oneOf(fd, "kind", keysOf(STUDY_TASK_KINDS), "estudiar"),
        asignatura_id: optText(fd, "subject_id") ?? undefined,
        notas: optText(fd, "notes") ?? undefined,
      },
    ]);
  });
}

/** Crea varias tareas de golpe (Claude por MCP). Con `replaceFrom` rehace el plan desde ese día. */
export async function createStudyTasks(tasks: StudyTaskInput[], replaceFrom?: string) {
  let created = 0;
  const result = await mutate(async ({ supabase }) => {
    created = await insertStudyTasks(supabase, tasks, replaceFrom);
  });
  return result ?? { creadas: created };
}

export async function moveStudyTask(id: string, day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Fecha no válida" };
  return mutate(({ supabase }) => supabase.from("study_tasks").update({ day }).eq("id", id));
}

/** Reparte las tareas atrasadas entre los próximos días (antes de cada examen). */
export async function rescheduleStudyPlan() {
  let moved = 0;
  const result = await mutate(async ({ supabase }) => {
    moved = await rescheduleOverdueTasks(supabase);
  });
  return result ?? { movidas: moved };
}

/** Botón "Reorganizar lo atrasado" de la pestaña Plan. */
export async function reorganizeOverdue() {
  const result = await rescheduleStudyPlan();
  return "error" in result ? { error: result.error } : undefined;
}

/** Borra las tareas pendientes de un rango (opcionalmente de una asignatura). */
export async function deleteStudyTasks(from: string, to?: string, subjectId?: string) {
  return mutate(({ supabase }) => {
    let q = supabase.from("study_tasks").delete().eq("done", false).gte("day", from);
    if (to) q = q.lte("day", to);
    if (subjectId) q = q.eq("subject_id", subjectId);
    return q;
  });
}

// ─── Exámenes ───────────────────────────────────────────────────────
export async function saveExam(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const subjectId = text(fd, "subject_id");
    const examDate = text(fd, "exam_date");
    if (!subjectId || !examDate) return invalid("Elige asignatura y fecha");
    const fields = {
      subject_id: subjectId,
      exam_date: examDate,
      kind: oneOf(fd, "kind", keysOf(EXAM_KINDS), "final"),
      title: optText(fd, "title"),
      start_time: optText(fd, "start_time"),
      grade: optNumber(fd, "grade"),
      notes: optText(fd, "notes"),
    };
    return upsert(supabase, "exams", id, fields);
  });
}

// ─── Flashcards (FSRS) ──────────────────────────────────────────────
export async function createFlashcard(fd: FormData) {
  return mutate(({ supabase }) => {
    const front = text(fd, "front");
    const back = text(fd, "back");
    const subjectId = text(fd, "subject_id");
    if (!front || !back || !subjectId) return invalid("Rellena asignatura, pregunta y respuesta");
    const card = createEmptyCard();
    return supabase.from("flashcards").insert({ subject_id: subjectId, front, back, fsrs: card, due: card.due.toISOString() });
  });
}

/** Puntúa una tarjeta durante el repaso. No refresca la ruta para no cortar la sesión. */
export async function reviewFlashcard(id: string, grade: Grade) {
  return mutate(
    async ({ supabase }) => {
      const { data, error } = await supabase.from("flashcards").select("fsrs").eq("id", id).single();
      if (error) return { error };
      const current = (data.fsrs as CardInput | null) ?? createEmptyCard();
      const { card } = scheduler.next(current, new Date(), grade);
      return supabase.from("flashcards").update({ fsrs: card, due: card.due.toISOString() }).eq("id", id);
    },
    { refreshRoute: false },
  );
}

// ─── Historial académico ────────────────────────────────────────────
export async function saveEducation(id: string | null, fd: FormData) {
  return mutate(async ({ supabase, userId }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe el nombre del título o curso");
    const certificate = uploadedFile(fd, userId);
    const fields = {
      title,
      kind: oneOf(fd, "kind", keysOf(EDUCATION_KINDS), "titulacion"),
      level: oneOf(fd, "level", keysOf(EDUCATION_LEVELS), "otro"),
      center: optText(fd, "center"),
      start_year: optInt(fd, "start_year"),
      end_year: optInt(fd, "end_year"),
      hours: optInt(fd, "hours"),
      grade: optText(fd, "grade"),
      notes: optText(fd, "notes"),
      ...(certificate && { certificate_path: certificate.path }),
    };
    if (id && certificate) await removeRowFile(supabase, "education", id, "certificate_path");
    return upsert(supabase, "education", id, fields);
  });
}

export async function deleteEducation(id: string) {
  return mutate(async ({ supabase }) => {
    await removeRowFile(supabase, "education", id, "certificate_path");
    return supabase.from("education").delete().eq("id", id);
  });
}
