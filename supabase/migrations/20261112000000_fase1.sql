-- ════════════════════════════════════════════════════════════════════
-- root · Fase 1 — Base, Hoy y Estudios
-- App de un solo usuario: cada fila pertenece a auth.uid() y RLS lo impone.
-- ════════════════════════════════════════════════════════════════════

-- ─── Utilidades internas (el esquema private no se expone por la API) ──
create schema if not exists private;

-- Plantilla de columnas comunes. Cada tabla la copia con `like ... including all`
-- (id, user_id con default auth.uid(), created_at).
create table if not exists private.owned (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Añade FK a auth.users, índice por usuario, RLS y la política de propietario.
create or replace function private.setup_owned_table(tbl regclass)
returns void
language plpgsql
as $$
begin
  execute format(
    'alter table %s add foreign key (user_id) references auth.users (id) on delete cascade', tbl);
  execute format('create index on %s (user_id)', tbl);
  execute format('alter table %s enable row level security', tbl);
  execute format(
    'create policy "solo el propietario" on %s for all to authenticated
       using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))', tbl);
end;
$$;

-- ─── Enums ──────────────────────────────────────────────────────────
-- Deben coincidir con las claves de src/lib/constants.ts
create type public.tone            as enum ('study', 'work', 'content', 'gym', 'acc');
create type public.cover_pattern   as enum ('dots', 'diam', 'rings', 'grid', 'stripes');
create type public.file_kind       as enum ('teoria', 'boletin', 'general', 'otro');
create type public.file_status     as enum ('pendiente', 'en_curso', 'hecho');
create type public.exam_kind       as enum ('parcial', 'final', 'practica', 'otro');
create type public.education_kind  as enum ('titulacion', 'curso');
create type public.education_level as enum
  ('eso', 'bachillerato', 'grado_medio', 'grado_superior', 'grado', 'master', 'curso', 'idiomas', 'otro');
create type public.agenda_category as enum ('estudio', 'contenido', 'gym', 'freelance', 'personal');
create type public.inbox_kind      as enum ('tarea', 'idea', 'nota', 'contenido');

-- ════════════════════════════════════════════════════════════════════
-- ESTUDIOS
-- ════════════════════════════════════════════════════════════════════

-- Asignaturas (las "tarjetas" tipo Moodle)
create table public.subjects (
  like private.owned including all,
  name        text not null check (char_length(name) between 1 and 120),
  code        text,
  description text,
  course_year smallint not null default 1 check (course_year between 1 and 6),
  semester    smallint not null default 1 check (semester in (1, 2)),
  tone        public.tone not null default 'study',
  pattern     public.cover_pattern not null default 'dots',
  glyph       text check (char_length(glyph) <= 4),
  cover_path  text,
  position    integer not null default 0
);

-- Temas de cada asignatura
create table public.topics (
  like private.owned including all,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 160),
  mastery    smallint not null default 0 check (mastery between 0 and 5),
  position   integer not null default 0
);
create index on public.topics (subject_id, position);

-- Contenidos a estudiar dentro de un tema (checklist)
create table public.topic_contents (
  like private.owned including all,
  topic_id uuid not null references public.topics (id) on delete cascade,
  title    text not null check (char_length(title) between 1 and 200),
  done     boolean not null default false,
  position integer not null default 0
);
create index on public.topic_contents (topic_id, position);

-- PDFs de teoría, boletines y archivos generales de la asignatura
create table public.study_files (
  like private.owned including all,
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  topic_id     uuid references public.topics (id) on delete cascade, -- null = sección "General"
  kind         public.file_kind not null default 'teoria',
  name         text not null,
  storage_path text not null unique,
  size_bytes   bigint,
  mime_type    text,
  status       public.file_status -- solo boletines
);
create index on public.study_files (subject_id);
create index on public.study_files (topic_id);

-- Exámenes
create table public.exams (
  like private.owned including all,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  kind       public.exam_kind not null default 'final',
  title      text,
  exam_date  date not null,
  start_time time,
  grade      numeric(4, 2) check (grade between 0 and 10),
  notes      text
);
create index on public.exams (user_id, exam_date);
create index on public.exams (subject_id);

-- Flashcards con repetición espaciada (estado FSRS de ts-fsrs en jsonb)
create table public.flashcards (
  like private.owned including all,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  topic_id   uuid references public.topics (id) on delete set null,
  front      text not null,
  back       text not null,
  fsrs       jsonb,
  due        timestamptz not null default now()
);
create index on public.flashcards (subject_id, due);

-- Historial académico: titulaciones (ESO, grado medio, superior…) y cursos
create table public.education (
  like private.owned including all,
  kind             public.education_kind not null default 'titulacion',
  level            public.education_level not null default 'otro',
  title            text not null,
  center           text,
  start_year       smallint,
  end_year         smallint, -- null = en curso
  hours            integer,
  grade            text,
  certificate_path text,
  notes            text
);

-- ════════════════════════════════════════════════════════════════════
-- HOY: agenda, hábitos y bandeja de entrada
-- ════════════════════════════════════════════════════════════════════

create table public.agenda_items (
  like private.owned including all,
  day        date not null,
  start_time time,
  end_time   time,
  title      text not null,
  notes      text,
  category   public.agenda_category not null default 'personal',
  done       boolean not null default false
);
create index on public.agenda_items (user_id, day);

create table public.habits (
  like private.owned including all,
  name     text not null check (char_length(name) between 1 and 80),
  position integer not null default 0,
  archived boolean not null default false
);

create table public.habit_logs (
  user_id  uuid not null default auth.uid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  day      date not null,
  primary key (habit_id, day)
);
create index on public.habit_logs (user_id, day);

create table public.inbox_items (
  like private.owned including all,
  kind         public.inbox_kind not null default 'nota',
  content      text not null,
  processed_at timestamptz
);

-- ─── RLS + FK + índice por usuario en todas las tablas ──────────────
select private.setup_owned_table(t)
from unnest(array[
  'public.subjects', 'public.topics', 'public.topic_contents', 'public.study_files',
  'public.exams', 'public.flashcards', 'public.education',
  'public.agenda_items', 'public.habits', 'public.habit_logs', 'public.inbox_items'
]::regclass[]) as t;

-- ════════════════════════════════════════════════════════════════════
-- STORAGE: bucket privado "files", carpeta raíz = id del usuario
-- Rutas: {user_id}/subjects/{subject_id}/...  ·  {user_id}/education/...
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('files', 'files', false)
on conflict (id) do nothing;

create policy "files: solo el propietario"
on storage.objects for all to authenticated
using (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'files' and (storage.foldername(name))[1] = (select auth.uid())::text);
