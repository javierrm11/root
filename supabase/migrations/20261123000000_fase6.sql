-- ════════════════════════════════════════════════════════════════════
-- root · Fase 6 — Lectura de PDF para Claude y práctica por tipos de ejercicio
-- ════════════════════════════════════════════════════════════════════

-- Texto de cada archivo (Markdown, con marcas "--- Página N ---") para que Claude lo lea por MCP.
-- Se saca del PDF al subirlo; si es un escaneado o una imagen, lo transcribe Gemini.
create type public.file_text_source as enum ('pdf', 'gemini');

alter table public.study_files
  add column content_md     text,
  add column content_source public.file_text_source,
  add column content_at     timestamptz;

-- Método de estudio: tipos de ejercicio del boletín → guía → tandas de práctica
create type public.exercise_status as enum ('pendiente', 'practicando', 'dominado');
create type public.practice_mode   as enum ('test', 'desarrollo');

-- Tipos de ejercicio de un tema (los detecta Claude o Gemini leyendo el boletín)
create table public.exercise_types (
  like private.owned including all,
  topic_id    uuid not null references public.topics (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 160),
  description text,
  count       integer check (count >= 0),         -- cuántos hay en el boletín
  examples    text,                               -- cuáles son, p. ej. "1, 4 y 7"
  guide       text,                               -- teoría, pasos y ejemplo resuelto (Markdown)
  guide_at    timestamptz,
  status      public.exercise_status not null default 'pendiente',
  position    integer not null default 0
);
create index on public.exercise_types (topic_id, position);

-- Tanda de práctica de un tipo de ejercicio
create table public.practice_sets (
  like private.owned including all,
  exercise_type_id uuid not null references public.exercise_types (id) on delete cascade,
  mode             public.practice_mode not null,
  correct          integer,                       -- se rellenan al terminar la tanda
  total            integer,
  finished_at      timestamptz
);
create index on public.practice_sets (exercise_type_id, created_at);

-- Ejercicios de una tanda, con pista y solución opcionales de ver
create table public.practice_items (
  like private.owned including all,
  set_id         uuid not null references public.practice_sets (id) on delete cascade,
  position       integer not null default 0,
  question       text not null,
  options        text[],                          -- solo en test
  correct_option smallint,                        -- índice (desde 0) de la opción buena
  answer         text,                            -- resultado final en desarrollo (opcional)
  hint           text,
  solution       text not null,
  chosen_option  smallint,                        -- lo que marqué en el test
  correct        boolean,                         -- null = sin responder
  answered_at    timestamptz
);
create index on public.practice_items (set_id, position);

select private.setup_owned_table(t)
from unnest(array['public.exercise_types', 'public.practice_sets', 'public.practice_items']::regclass[]) as t;
