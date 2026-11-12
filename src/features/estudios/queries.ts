import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser, must } from "@/lib/supabase/server";
import { signPaths } from "@/lib/storage";
import { groupBy } from "@/lib/collections";
import { addMonths, daysBetween, monthStart, todayISO } from "@/lib/dates";
import type { Education, Exam, Flashcard, StudyFile, Subject, Topic, TopicContent } from "@/lib/types";
import { masteryPct, priorityScore } from "./logic";

type ExamWithDays = Exam & { days: number };

/** Datos comunes: asignaturas, sus temas y los próximos exámenes (una vez por petición). */
const loadStudyBase = cache(async () => {
  const { supabase, userId } = await requireUser();
  const today = todayISO();
  const [subjects, topics, exams] = await Promise.all([
    supabase.from("subjects").select("*").order("position").order("created_at").then(must<Subject[]>),
    supabase.from("topics").select("*").order("position").then(must<Topic[]>),
    supabase.from("exams").select("*").gte("exam_date", today).order("exam_date").then(must<Exam[]>),
  ]);
  const withDays = exams.map((e) => ({ ...e, days: daysBetween(today, e.exam_date) }));
  return { supabase, userId, today, subjects, topicsBySubject: groupBy(topics, (t) => t.subject_id), exams: withDays };
});

export type SubjectSummary = Subject & {
  coverUrl: string | null;
  topicCount: number;
  pct: number;
  nextExam: ExamWithDays | null;
};

/** Pestaña Asignaturas: tarjetas con portada, progreso y próximo examen. */
export async function getSubjectsOverview() {
  const { supabase, userId, subjects, topicsBySubject, exams } = await loadStudyBase();
  const covers = await signPaths(supabase, subjects.map((s) => s.cover_path));
  const list: SubjectSummary[] = subjects.map((s) => {
    const topics = topicsBySubject.get(s.id) ?? [];
    return {
      ...s,
      coverUrl: s.cover_path ? (covers.get(s.cover_path) ?? null) : null,
      topicCount: topics.length,
      pct: masteryPct(topics.map((t) => t.mastery)),
      nextExam: exams.find((e) => e.subject_id === s.id) ?? null,
    };
  });
  return { userId, subjects: list };
}

/** Próximo examen de cualquier asignatura (para Hoy y la cabecera de Estudios). */
export async function getNextExam() {
  const { subjects, topicsBySubject, exams } = await loadStudyBase();
  const exam = exams[0];
  if (!exam) return null;
  const subject = subjects.find((s) => s.id === exam.subject_id);
  const topics = topicsBySubject.get(exam.subject_id) ?? [];
  return { ...exam, subjectName: subject?.name ?? "", pct: masteryPct(topics.map((t) => t.mastery)) };
}

/** Temas más urgentes: poco dominio y examen cerca. */
export async function getPriorityTopics(limit = 3) {
  const { subjects, topicsBySubject, exams } = await loadStudyBase();
  const firstExam = new Map<string, ExamWithDays>();
  exams.forEach((e) => firstExam.has(e.subject_id) || firstExam.set(e.subject_id, e));
  return [...firstExam.values()]
    .flatMap((exam) =>
      (topicsBySubject.get(exam.subject_id) ?? [])
        .filter((t) => t.mastery < 5)
        .map((t) => ({
          ...t,
          subjectName: subjects.find((s) => s.id === t.subject_id)?.name ?? "",
          examDays: exam.days,
          score: priorityScore(t.mastery, exam.days),
        })),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type TopicDetail = Topic & {
  contents: TopicContent[];
  files: Array<StudyFile & { url: string | null }>;
};

/** Dentro de una asignatura: temas con sus archivos y contenidos, y sus exámenes. */
export async function getSubjectDetail(id: string) {
  const { supabase, userId } = await requireUser();
  const subject = await supabase.from("subjects").select("*").eq("id", id).maybeSingle().then(must<Subject | null>);
  if (!subject) notFound();

  const today = todayISO();
  const [topics, files, exams] = await Promise.all([
    supabase.from("topics").select("*").eq("subject_id", id).order("position").order("created_at").then(must<Topic[]>),
    supabase.from("study_files").select("*").eq("subject_id", id).order("created_at").then(must<StudyFile[]>),
    supabase.from("exams").select("*").eq("subject_id", id).order("exam_date").then(must<Exam[]>),
  ]);
  const contents = topics.length
    ? await supabase
        .from("topic_contents")
        .select("*")
        .in("topic_id", topics.map((t) => t.id))
        .order("position")
        .order("created_at")
        .then(must<TopicContent[]>)
    : [];

  const urls = await signPaths(supabase, [subject.cover_path, ...files.map((f) => f.storage_path)]);
  const signed = files.map((f) => ({ ...f, url: urls.get(f.storage_path) ?? null }));
  const contentsByTopic = groupBy(contents, (c) => c.topic_id);
  const filesByTopic = groupBy(signed, (f) => f.topic_id);
  const boletines = signed.filter((f) => f.kind === "boletin");
  const withDays = exams.map((e) => ({ ...e, days: daysBetween(today, e.exam_date) }));

  return {
    userId,
    subject,
    coverUrl: subject.cover_path ? (urls.get(subject.cover_path) ?? null) : null,
    generalFiles: filesByTopic.get(null) ?? [],
    topics: topics.map<TopicDetail>((t) => ({
      ...t,
      contents: contentsByTopic.get(t.id) ?? [],
      files: filesByTopic.get(t.id) ?? [],
    })),
    pct: masteryPct(topics.map((t) => t.mastery)),
    fileCount: files.length,
    boletines: { done: boletines.filter((f) => f.status === "hecho").length, total: boletines.length },
    exams: withDays,
    nextExam: withDays.find((e) => e.days >= 0) ?? null,
  };
}

/** Pestaña Exámenes: calendario del mes, próximos exámenes y días con estudio planificado. */
export async function getExamsView(month?: string) {
  const { supabase, today, subjects, topicsBySubject, exams } = await loadStudyBase();
  const start = monthStart(month && /^\d{4}-\d{2}$/.test(month) ? month : today);
  const end = addMonths(start, 1);
  const [monthExams, studyDays] = await Promise.all([
    supabase.from("exams").select("*").gte("exam_date", start).lt("exam_date", end).then(must<Exam[]>),
    supabase.from("agenda_items").select("day").eq("category", "estudio").gte("day", start).lt("day", end).then(must<Array<{ day: string }>>),
  ]);
  return {
    today,
    month: start,
    examDays: new Set(monthExams.map((e) => e.exam_date)),
    studyDays: new Set(studyDays.map((d) => d.day)),
    subjects,
    upcoming: exams.map((e) => ({
      ...e,
      subjectName: subjects.find((s) => s.id === e.subject_id)?.name ?? "",
      masteries: (topicsBySubject.get(e.subject_id) ?? []).map((t) => t.mastery),
    })),
  };
}

/** Pestaña Flashcards: una baraja por asignatura con las tarjetas pendientes hoy. */
export async function getDecks() {
  const { supabase, subjects } = await loadStudyBase();
  const cards = await supabase.from("flashcards").select("subject_id, due").then(must<Pick<Flashcard, "subject_id" | "due">[]>);
  const now = new Date().toISOString();
  const bySubject = groupBy(cards, (c) => c.subject_id);
  return {
    subjects,
    decks: subjects.map((s) => {
      const list = bySubject.get(s.id) ?? [];
      return { subject: s, total: list.length, due: list.filter((c) => c.due <= now).length };
    }),
  };
}

/** Tarjetas a repasar ahora de una asignatura. */
export async function getDueCards(subjectId: string) {
  const { supabase } = await requireUser();
  const subject = await supabase.from("subjects").select("id, name").eq("id", subjectId).maybeSingle().then(must<Pick<Subject, "id" | "name"> | null>);
  if (!subject) notFound();
  const cards = await supabase
    .from("flashcards")
    .select("*")
    .eq("subject_id", subjectId)
    .lte("due", new Date().toISOString())
    .order("due")
    .limit(100)
    .then(must<Flashcard[]>);
  return { subject, cards };
}

/** Pestaña Historial: formación y cursos con su certificado. */
export async function getEducation() {
  const { supabase, userId } = await requireUser();
  const rows = await supabase
    .from("education")
    .select("*")
    .order("start_year", { ascending: false, nullsFirst: false })
    .then(must<Education[]>);
  const urls = await signPaths(supabase, rows.map((r) => r.certificate_path));
  const items = rows.map((r) => ({ ...r, certificateUrl: r.certificate_path ? (urls.get(r.certificate_path) ?? null) : null }));
  return {
    userId,
    degrees: items.filter((r) => r.kind === "titulacion"),
    courses: items.filter((r) => r.kind === "curso"),
  };
}

export type EducationItem = Awaited<ReturnType<typeof getEducation>>["degrees"][number];
