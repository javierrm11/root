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
