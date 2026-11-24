import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser, must, type Db } from "@/lib/supabase/server";
import { signPaths } from "@/lib/storage";
import { groupBy } from "@/lib/collections";
import { addDays, addMonths, daysBetween, monthStart, todayISO } from "@/lib/dates";
import type { Education, Exam, ExerciseType, Flashcard, PracticeItem, PracticeSet, StudyFile, StudyTask, Subject, Topic, TopicContent } from "@/lib/types";
import { masteryPct, nextExerciseType, priorityScore } from "./logic";
import { loadExerciseType } from "./practice";

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

/** Archivo sin su texto (content_md puede ser muy largo y la pantalla no lo usa). */
export type StudyFileMeta = Omit<StudyFile, "content_md">;
const FILE_COLUMNS =
  "id, user_id, created_at, subject_id, topic_id, kind, name, storage_path, size_bytes, mime_type, status, content_source, content_at";

export type TopicDetail = Topic & {
  contents: TopicContent[];
  files: Array<StudyFileMeta & { url: string | null }>;
  exerciseTypes: ExerciseType[];
};

/** Dentro de una asignatura: temas con sus archivos y contenidos, y sus exámenes. */
export async function getSubjectDetail(id: string) {
  const { supabase, userId } = await requireUser();
  const subject = await supabase.from("subjects").select("*").eq("id", id).maybeSingle().then(must<Subject | null>);
  if (!subject) notFound();

  const today = todayISO();
  const [topics, files, exams] = await Promise.all([
    supabase.from("topics").select("*").eq("subject_id", id).order("position").order("created_at").then(must<Topic[]>),
    supabase.from("study_files").select(FILE_COLUMNS).eq("subject_id", id).order("created_at").then(must<StudyFileMeta[]>),
    supabase.from("exams").select("*").eq("subject_id", id).order("exam_date").then(must<Exam[]>),
  ]);
  const topicIds = topics.map((t) => t.id);
  const [contents, exerciseTypes] = topics.length
    ? await Promise.all([
        supabase.from("topic_contents").select("*").in("topic_id", topicIds).order("position").order("created_at").then(must<TopicContent[]>),
        supabase.from("exercise_types").select("*").in("topic_id", topicIds).order("position").order("created_at").then(must<ExerciseType[]>),
      ])
    : [[], []];

  const urls = await signPaths(supabase, [subject.cover_path, ...files.map((f) => f.storage_path)]);
  const signed = files.map((f) => ({ ...f, url: urls.get(f.storage_path) ?? null }));
  const contentsByTopic = groupBy(contents, (c) => c.topic_id);
  const typesByTopic = groupBy(exerciseTypes, (t) => t.topic_id);
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
      exerciseTypes: typesByTopic.get(t.id) ?? [],
    })),
    pct: masteryPct(topics.map((t) => t.mastery)),
    fileCount: files.length,
    boletines: { done: boletines.filter((f) => f.status === "hecho").length, total: boletines.length },
    exams: withDays,
    nextExam: withDays.find((e) => e.days >= 0) ?? null,
  };
}

/** Tipos de ejercicio de un tema, en orden (para saber cuál toca después). */
const topicTypes = (supabase: Db, topicId: string) =>
  supabase.from("exercise_types").select("*").eq("topic_id", topicId).order("position").order("created_at").then(must<ExerciseType[]>);

/** Un tipo de ejercicio: guía, tandas hechas y el siguiente tipo del tema. */
export async function getExerciseTypeView(id: string) {
  const { supabase } = await requireUser();
  const loaded = await loadExerciseType(supabase, id);
  if (!loaded) notFound();
  const [sets, siblings] = await Promise.all([
    supabase.from("practice_sets").select("*").eq("exercise_type_id", id).order("created_at", { ascending: false }).then(must<PracticeSet[]>),
    topicTypes(supabase, loaded.topic.id),
  ]);
  // Las tandas sin terminar muestran cuántos llevas respondidos.
  const open = sets.filter((s) => !s.finished_at).map((s) => s.id);
  const answered = open.length
    ? await supabase.from("practice_items").select("set_id, correct").in("set_id", open).then(must<Pick<PracticeItem, "set_id" | "correct">[]>)
    : [];
  const bySet = groupBy(answered, (i) => i.set_id);
  return {
    ...loaded,
    sets: sets.map((s) => {
      const items = bySet.get(s.id) ?? [];
      return { ...s, progress: s.finished_at ? null : { done: items.filter((i) => i.correct !== null).length, total: items.length } };
    }),
    next: nextExerciseType(siblings, id),
  };
}

/** Una tanda de práctica con sus ejercicios, y a dónde ir al acabar. */
export async function getPracticeView(id: string) {
  const { supabase } = await requireUser();
  const set = await supabase.from("practice_sets").select("*").eq("id", id).maybeSingle().then(must<PracticeSet | null>);
  if (!set) notFound();
  const [loaded, items] = await Promise.all([
    loadExerciseType(supabase, set.exercise_type_id),
    supabase.from("practice_items").select("*").eq("set_id", id).order("position").then(must<PracticeItem[]>),
  ]);
  if (!loaded) notFound();
  const siblings = await topicTypes(supabase, loaded.topic.id);
  return { set, items, ...loaded, next: nextExerciseType(siblings, loaded.type.id) };
}

export type PlanTask = StudyTask & { subjectName: string; href: string };

/** Enlace de una tarea del plan: su tipo de ejercicio, su asignatura o el propio plan. */
const taskHref = (t: StudyTask) =>
  t.exercise_type_id ? `/estudios/ejercicio/${t.exercise_type_id}` : t.subject_id ? `/estudios/asignatura/${t.subject_id}` : "/estudios/plan";

/** Pestaña Plan: tareas atrasadas, las de los próximos días y la cuenta atrás de cada examen. */
export async function getStudyPlan(weeks = 2) {
  const { supabase, today, subjects, exams } = await loadStudyBase();
  const until = weeks > 0 ? addDays(today, weeks * 7 - 1) : null;
  let upcomingQuery = supabase.from("study_tasks").select("*").gte("day", today);
  if (until) upcomingQuery = upcomingQuery.lte("day", until);
  const [upcoming, overdue, all] = await Promise.all([
    upcomingQuery.order("day").order("position").order("created_at").then(must<StudyTask[]>),
    supabase.from("study_tasks").select("*").eq("done", false).lt("day", today).order("day").then(must<StudyTask[]>),
    supabase.from("study_tasks").select("subject_id, done, day").then(must<Array<Pick<StudyTask, "subject_id" | "done" | "day">>>),
  ]);
  const name = new Map(subjects.map((s) => [s.id, s.name]));
  const enrich = (t: StudyTask): PlanTask => ({ ...t, subjectName: t.subject_id ? (name.get(t.subject_id) ?? "") : "", href: taskHref(t) });
  const bySubject = groupBy(all, (t) => t.subject_id);
  return {
    today,
    subjects,
    overdue: overdue.map(enrich),
    days: [...groupBy(upcoming.map(enrich), (t) => t.day)].map(([day, tasks]) => ({ day, tasks })),
    later: until ? all.filter((t) => t.day > until && !t.done).length : 0,
    total: all.length,
    exams: exams.map((e) => {
      const tasks = bySubject.get(e.subject_id) ?? [];
      return { ...e, subjectName: name.get(e.subject_id) ?? "", planDone: tasks.filter((t) => t.done).length, planTotal: tasks.length };
    }),
  };
}

/** Tareas del plan de hoy y cuántas hay atrasadas (para Hoy). */
export async function getTodayPlan() {
  const { supabase, today, subjects } = await loadStudyBase();
  const [tasks, overdue] = await Promise.all([
    supabase.from("study_tasks").select("*").eq("day", today).order("position").order("created_at").then(must<StudyTask[]>),
    supabase.from("study_tasks").select("id", { count: "exact", head: true }).eq("done", false).lt("day", today),
  ]);
  const name = new Map(subjects.map((s) => [s.id, s.name]));
  return {
    tasks: tasks.map((t): PlanTask => ({ ...t, subjectName: t.subject_id ? (name.get(t.subject_id) ?? "") : "", href: taskHref(t) })),
    overdue: overdue.count ?? 0,
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
