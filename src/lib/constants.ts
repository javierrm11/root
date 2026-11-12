// Catálogos de la app. Las claves coinciden con los enums de Postgres (supabase/migrations).

/** Colores de categoría. "acc" = acento de la paleta, "mut" = gris. */
export type Tone = "study" | "work" | "content" | "gym" | "acc" | "mut";

type Entry = { label: string; tone?: Tone; short?: string };
type Catalog<K extends string> = Record<K, Entry>;

const catalog = <K extends string>(entries: Catalog<K>) => entries;

export const SUBJECT_TONES = catalog({
  study: { label: "Azul", tone: "study" },
  work: { label: "Ámbar", tone: "work" },
  content: { label: "Rosa", tone: "content" },
  gym: { label: "Verde", tone: "gym" },
  acc: { label: "Acento", tone: "acc" },
});

export const COVER_PATTERNS = catalog({
  dots: { label: "Puntos" },
  diam: { label: "Rombos" },
  rings: { label: "Anillos" },
  grid: { label: "Cuadrícula" },
  stripes: { label: "Rayas" },
});

export const FILE_KINDS = catalog({
  teoria: { label: "Teoría", short: "PDF", tone: "content" },
  boletin: { label: "Boletín", short: "EJ", tone: "study" },
  general: { label: "General", short: "DOC", tone: "mut" },
  otro: { label: "Otro", short: "DOC", tone: "mut" },
});

export const FILE_STATUS = catalog({
  pendiente: { label: "Pendiente", tone: "mut" },
  en_curso: { label: "En curso", tone: "work" },
  hecho: { label: "Hecho", tone: "gym" },
});

export const EXAM_KINDS = catalog({
  parcial: { label: "Parcial" },
  final: { label: "Final" },
  practica: { label: "Práctica" },
  otro: { label: "Otro" },
});

export const EDUCATION_KINDS = catalog({
  titulacion: { label: "Titulación" },
  curso: { label: "Curso o certificado" },
});

export const EDUCATION_LEVELS = catalog({
  eso: { label: "ESO" },
  bachillerato: { label: "Bachillerato" },
  grado_medio: { label: "Grado Medio" },
  grado_superior: { label: "Grado Superior" },
  grado: { label: "Grado universitario" },
  master: { label: "Máster" },
  curso: { label: "Curso" },
  idiomas: { label: "Idiomas" },
  otro: { label: "Otro" },
});

export const AGENDA_CATEGORIES = catalog({
  estudio: { label: "Estudio", tone: "study" },
  contenido: { label: "Contenido", tone: "content" },
  gym: { label: "Gym", tone: "gym" },
  freelance: { label: "Freelance", tone: "work" },
  personal: { label: "Personal", tone: "mut" },
});

export const INBOX_KINDS = catalog({
  tarea: { label: "Tarea", tone: "acc" },
  idea: { label: "Idea", tone: "work" },
  nota: { label: "Nota", tone: "study" },
  contenido: { label: "Contenido", tone: "content" },
});

// ─── Fase 2 · Proyectos y freelance ─────────────────────────────────
export const PROJECT_STATUS = catalog({
  propuesta: { label: "Propuesta", tone: "study" },
  en_curso: { label: "En curso", tone: "acc" },
  pausado: { label: "Pausado", tone: "mut" },
  entregado: { label: "Entregado", tone: "gym" },
});

export const FEATURE_COLUMNS = catalog({
  idea: { label: "Idea" },
  todo: { label: "Por hacer" },
  doing: { label: "En curso" },
  done: { label: "Hecho" },
});

export const LEVELS = catalog({
  alto: { label: "Alto", tone: "acc" },
  medio: { label: "Medio", tone: "work" },
  bajo: { label: "Bajo", tone: "mut" },
});

export const INVOICE_STATUS = catalog({
  emitida: { label: "Por cobrar", tone: "work" },
  cobrada: { label: "Cobrada", tone: "gym" },
  vencida: { label: "Vencida", tone: "content" },
});

export const EXPENSE_CATEGORIES = catalog({
  software: { label: "Software" },
  equipo: { label: "Equipo" },
  web: { label: "Web y dominios" },
  diseno: { label: "Diseño" },
  formacion: { label: "Formación" },
  otro: { label: "Otro" },
});

/** Criterios para puntuar ideas (columnas de la tabla ideas) y su peso. */
export const IDEA_CRITERIA = [
  { key: "pain", label: "Dolor del problema", weight: 3 },
  { key: "market", label: "Tamaño de mercado", weight: 3 },
  { key: "monetization", label: "Monetización", weight: 3 },
  { key: "competition", label: "Poca competencia", weight: 2 },
  { key: "speed", label: "MVP rápido", weight: 2 },
  { key: "fit", label: "Encaje contigo", weight: 2 },
  { key: "advantage", label: "Ventaja propia", weight: 2 },
] as const;

// ─── Fase 3 · Contenido (TikTok) ────────────────────────────────────
export const VIDEO_STAGES = catalog({
  guion: { label: "Guion", tone: "study" },
  grabar: { label: "Grabar", tone: "content" },
  editar: { label: "Editar", tone: "work" },
  programado: { label: "Programado", tone: "acc" },
  publicado: { label: "Publicado", tone: "gym" },
});

export const VIDEO_FORMATS = catalog({
  tutorial: { label: "Tutorial" },
  explicacion: { label: "Explicación" },
  reto: { label: "Reto" },
  comparativa: { label: "Comparativa" },
  storytime: { label: "Storytime" },
  setup: { label: "Setup" },
  lista: { label: "Lista" },
  opinion: { label: "Opinión" },
  vlog: { label: "Vlog" },
  tendencia: { label: "Tendencia" },
});

/** Las tres tareas con fecha de cada vídeo y su columna en la tabla videos. */
export const VIDEO_TASKS = [
  { key: "record_date", label: "Grabar", tone: "content" },
  { key: "edit_date", label: "Editar", tone: "work" },
  { key: "publish_date", label: "Publicar", tone: "acc" },
] as const;

/** Lunes = 0 (como publish_windows.weekday). */
export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

// ─── Fase 4 · Gym y objetivos ───────────────────────────────────────
export const PHOTO_ANGLES = catalog({
  frente: { label: "Frente" },
  perfil: { label: "Perfil" },
  espalda: { label: "Espalda" },
});

/** De dónde sale el progreso de cada objetivo (se calcula solo, salvo "manual"). */
export const GOAL_METRICS = catalog({
  manual: { label: "Lo actualizo a mano", tone: "mut" },
  subject_mastery: { label: "Dominio de una asignatura (%)", tone: "study" },
  exercise_record: { label: "Récord de un ejercicio (kg)", tone: "gym" },
  videos_published: { label: "Vídeos publicados", tone: "content" },
  new_clients: { label: "Clientes nuevos", tone: "work" },
  freelance_hours: { label: "Horas freelance", tone: "work" },
});

// ─── Fase 5 · Ajustes ───────────────────────────────────────────────
export const AI_FEATURES = catalog({
  resumen: { label: "Resumir temas", short: "Desde los PDF de cada tema" },
  flashcards: { label: "Crear flashcards", short: "Desde los PDF y contenidos de un tema" },
  revision: { label: "Revisión del domingo", short: "Resumen y plan de la semana" },
});

export const NOTIFICATIONS = catalog({
  estudio: { label: "Bloques de estudio", short: "Los de la agenda de hoy" },
  contenido: { label: "Grabar o publicar hoy", short: "Tareas de contenido del día" },
  facturas: { label: "Facturas vencidas", short: "Las que pasan de su fecha" },
  domingo: { label: "Revisión del domingo", short: "Recordatorio para hacerla" },
  gym: { label: "Entreno del día", short: "La rutina que toca" },
});

export type PhotoAngle = keyof typeof PHOTO_ANGLES;
export type GoalMetric = keyof typeof GOAL_METRICS;
export type AiFeature = keyof typeof AI_FEATURES;
export type NotificationKind = keyof typeof NOTIFICATIONS;

export type VideoStage = keyof typeof VIDEO_STAGES;
export type VideoFormat = keyof typeof VIDEO_FORMATS;
export type VideoTask = (typeof VIDEO_TASKS)[number]["key"];

export type IdeaCriterion = (typeof IDEA_CRITERIA)[number]["key"];
export type ProjectStatus = keyof typeof PROJECT_STATUS;
export type FeatureColumn = keyof typeof FEATURE_COLUMNS;
export type Level = keyof typeof LEVELS;
export type InvoiceStatus = keyof typeof INVOICE_STATUS;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export type SubjectTone = keyof typeof SUBJECT_TONES;
export type CoverPattern = keyof typeof COVER_PATTERNS;
export type FileKind = keyof typeof FILE_KINDS;
export type FileStatus = keyof typeof FILE_STATUS;
export type ExamKind = keyof typeof EXAM_KINDS;
export type EducationKind = keyof typeof EDUCATION_KINDS;
export type EducationLevel = keyof typeof EDUCATION_LEVELS;
export type AgendaCategory = keyof typeof AGENDA_CATEGORIES;
export type InboxKind = keyof typeof INBOX_KINDS;

export type Option = { value: string; label: string; tone?: Tone };

/** Convierte un catálogo en opciones para <select> o pills. */
export function toOptions<K extends string>(entries: Catalog<K>, only?: readonly K[]): Option[] {
  return (Object.keys(entries) as K[])
    .filter((key) => !only || only.includes(key))
    .map((key) => ({ value: key, label: entries[key].label, tone: entries[key].tone }));
}

export const keysOf = <K extends string>(entries: Catalog<K>) => Object.keys(entries) as K[];
