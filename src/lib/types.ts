// Filas de la base de datos (espejo de supabase/migrations).
import type {
  AgendaCategory,
  CoverPattern,
  EducationKind,
  EducationLevel,
  ExamKind,
  ExpenseCategory,
  FeatureColumn,
  FileKind,
  FileStatus,
  IdeaCriterion,
  InboxKind,
  InvoiceStatus,
  Level,
  ProjectStatus,
  SubjectTone,
  VideoFormat,
  VideoStage,
  PhotoAngle,
  GoalMetric,
  AiFeature,
  NotificationKind,
} from "./constants";

type Owned = { id: string; user_id: string; created_at: string };

/** Portada generada o subida: la comparten asignaturas y proyectos. */
export type Cover = {
  tone: SubjectTone;
  pattern: CoverPattern;
  glyph: string | null;
  cover_path: string | null;
};

export type Subject = Owned &
  Cover & {
    name: string;
    code: string | null;
    description: string | null;
    course_year: number;
    semester: number;
    position: number;
  };

export type Topic = Owned & {
  subject_id: string;
  title: string;
  mastery: number;
  position: number;
  summary: string | null;
  summary_at: string | null;
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

// ─── Fase 2 ─────────────────────────────────────────────────────────
export type Client = Owned & {
  name: string;
  contact_name: string | null;
  contact: string | null;
  notes: string | null;
  last_contact: string | null;
};

export type Project = Owned &
  Cover & {
    client_id: string | null;
    name: string;
    description: string | null;
    status: ProjectStatus;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    tech: string[];
    website: string | null;
    repo_url: string | null;
  };

export type ProjectFeature = Owned & {
  project_id: string;
  title: string;
  col: FeatureColumn;
  impact: Level;
  effort: Level;
  position: number;
};

export type TimeEntry = Owned & { project_id: string; day: string; hours: number; note: string | null };

export type Idea = Owned &
  Record<IdeaCriterion, number> & {
    title: string;
    description: string | null;
    project_id: string | null;
  };

export type Invoice = Owned & {
  client_id: string | null;
  project_id: string | null;
  number: string | null;
  concept: string | null;
  amount: number;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  status: InvoiceStatus;
};

export type Expense = Owned & { day: string; concept: string; category: ExpenseCategory; amount: number };

// ─── Fase 3 ─────────────────────────────────────────────────────────
export type ContentIdea = Owned & {
  title: string;
  hook: string | null;
  format: VideoFormat;
  hashtags: string | null;
  notes: string | null;
};

export type Video = Owned & {
  idea_id: string | null;
  title: string;
  format: VideoFormat;
  series: string | null;
  stage: VideoStage;
  record_date: string | null;
  edit_date: string | null;
  publish_date: string | null;
  publish_time: string | null;
  duration_s: number | null;
  sound: string | null;
  hashtags: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  notes: string | null;
};

export type PublishWindow = Owned & { weekday: number; start_time: string; end_time: string; note: string | null };

// ─── Fase 4 ─────────────────────────────────────────────────────────
export type Exercise = Owned & { name: string; muscle_group: string | null };

export type Routine = Owned & { name: string; weekdays: number[]; notes: string | null };

export type RoutineExercise = Owned & {
  routine_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: string;
  rest_s: number | null;
};

export type Workout = Owned & {
  routine_id: string | null;
  day: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
};

export type WorkoutSet = Owned & {
  workout_id: string;
  exercise_id: string;
  set_no: number;
  weight_kg: number | null;
  reps: number | null;
  done: boolean;
};

export type BodyMetric = Owned & {
  day: string;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
};

export type ProgressPhoto = Owned & { day: string; angle: PhotoAngle; storage_path: string };

export type Goal = Owned & {
  title: string;
  metric: GoalMetric;
  ref_id: string | null;
  target: number;
  manual_value: number;
  start_date: string;
  end_date: string;
};

// ─── Fase 5 ─────────────────────────────────────────────────────────
export type Settings = Owned & { ai: Record<AiFeature, boolean>; notifications: Record<NotificationKind, boolean> };

export type PlanItem = { title: string; day: string; category: AgendaCategory; added?: boolean };

export type WeeklyReview = Owned & {
  week_start: string;
  stats: Record<string, number>;
  summary: string | null;
  good: string[];
  improve: string[];
  plan: PlanItem[];
};
