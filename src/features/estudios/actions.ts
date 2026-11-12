"use server";

import { redirect } from "next/navigation";
import { createEmptyCard, fsrs, type CardInput, type Grade } from "ts-fsrs";
import { invalid, mutate } from "@/lib/actions";
import {
  COVER_PATTERNS,
  EDUCATION_KINDS,
  EDUCATION_LEVELS,
  EXAM_KINDS,
  FILE_KINDS,
  SUBJECT_TONES,
  keysOf,
  type FileStatus,
} from "@/lib/constants";
import { oneOf, optInt, optNumber, optText, text, uploadedFile } from "@/lib/form";
import { removePaths } from "@/lib/storage";
import type { Db } from "@/lib/supabase/server";
import { NEXT_FILE_STATUS } from "./logic";

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
    tone: oneOf(fd, "tone", keysOf(SUBJECT_TONES), "study"),
    pattern: oneOf(fd, "pattern", keysOf(COVER_PATTERNS), "dots"),
    glyph: optText(fd, "glyph")?.slice(0, 4) ?? null,
  };
}

/** Crea (id = null) o edita una asignatura. La portada es opcional. */
export async function saveSubject(id: string | null, fd: FormData) {
  return mutate(async ({ supabase, userId }) => {
    const fields = subjectFields(fd);
    if (!fields.name) return invalid("Ponle un nombre a la asignatura");
    const cover = uploadedFile(fd, userId);
    if (!id) return supabase.from("subjects").insert({ ...fields, cover_path: cover?.path ?? null });

    if (cover) {
      const { data } = await supabase.from("subjects").select("cover_path").eq("id", id).single();
      await removePaths(supabase, [data?.cover_path]);
    }
    return supabase.from("subjects").update({ ...fields, ...(cover && { cover_path: cover.path }) }).eq("id", id);
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
  return mutate(({ supabase, userId }) => {
    const file = uploadedFile(fd, userId);
    if (!file) return invalid("Elige un archivo");
    const kind = topicId ? oneOf(fd, "kind", keysOf(FILE_KINDS), "teoria") : "general";
    return supabase.from("study_files").insert({
      subject_id: subjectId,
      topic_id: topicId,
      kind,
      name: text(fd, "name") || file.name,
      storage_path: file.path,
      size_bytes: file.size,
      mime_type: file.mime,
      status: kind === "boletin" ? "pendiente" : null,
    });
  });
}

export async function cycleFileStatus(id: string, current: FileStatus) {
  return mutate(({ supabase }) => supabase.from("study_files").update({ status: NEXT_FILE_STATUS[current] }).eq("id", id));
}

export async function deleteStudyFile(id: string) {
  return mutate(async ({ supabase }) => {
    const { data } = await supabase.from("study_files").select("storage_path").eq("id", id).single();
    await removePaths(supabase, [data?.storage_path]);
    return supabase.from("study_files").delete().eq("id", id);
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
    return id ? supabase.from("exams").update(fields).eq("id", id) : supabase.from("exams").insert(fields);
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
    if (!id) return supabase.from("education").insert(fields);
    if (certificate) {
      const { data } = await supabase.from("education").select("certificate_path").eq("id", id).single();
      await removePaths(supabase, [data?.certificate_path]);
    }
    return supabase.from("education").update(fields).eq("id", id);
  });
}

export async function deleteEducation(id: string) {
  return mutate(async ({ supabase }) => {
    const { data } = await supabase.from("education").select("certificate_path").eq("id", id).single();
    await removePaths(supabase, [data?.certificate_path]);
    return supabase.from("education").delete().eq("id", id);
  });
}
