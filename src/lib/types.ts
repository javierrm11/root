// Filas de la base de datos (espejo de supabase/migrations).
import type {
  AgendaCategory,
  CoverPattern,
  EducationKind,
  EducationLevel,
  ExamKind,
  FileKind,
  FileStatus,
  InboxKind,
  SubjectTone,
} from "./constants";

type Owned = { id: string; user_id: string; created_at: string };

export type Subject = Owned & {
  name: string;
  code: string | null;
  description: string | null;
  course_year: number;
  semester: number;
  tone: SubjectTone;
  pattern: CoverPattern;
  glyph: string | null;
  cover_path: string | null;
  position: number;
};

export type Topic = Owned & {
  subject_id: string;
  title: string;
  mastery: number;
  position: number;
};

export type TopicContent = Owned & {
  topic_id: string;
  title: string;
  done: boolean;
  position: number;
};

export type StudyFile = Owned & {
  subject_id: string;
  topic_id: string | null;
  kind: FileKind;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  status: FileStatus | null;
};

export type Exam = Owned & {
  subject_id: string;
  kind: ExamKind;
  title: string | null;
  exam_date: string;
  start_time: string | null;
  grade: number | null;
  notes: string | null;
};

export type Flashcard = Owned & {
  subject_id: string;
  topic_id: string | null;
  front: string;
  back: string;
  fsrs: Record<string, unknown> | null;
  due: string;
};

export type Education = Owned & {
  kind: EducationKind;
  level: EducationLevel;
  title: string;
  center: string | null;
  start_year: number | null;
  end_year: number | null;
  hours: number | null;
  grade: string | null;
  certificate_path: string | null;
  notes: string | null;
};

export type AgendaItem = Owned & {
  day: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  notes: string | null;
  category: AgendaCategory;
  done: boolean;
};

export type Habit = Owned & { name: string; position: number; archived: boolean };

export type InboxItem = Owned & { kind: InboxKind; content: string; processed_at: string | null };
