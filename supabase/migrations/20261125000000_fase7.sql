-- ════════════════════════════════════════════════════════════════════
-- root · Fase 7 — Plan de exámenes y avisos guardados
-- (el calendario global no necesita tablas: junta las del resto de fases)
-- ════════════════════════════════════════════════════════════════════

-- Plan de exámenes: qué hacer cada día (sin horas), enlazado a la asignatura, el tema o el tipo de ejercicio
create type public.study_task_kind as enum ('estudiar', 'ejercicios', 'repasar', 'flashcards', 'simulacro', 'otro');

create table public.study_tasks (
  like private.owned including all,
  day              date not null,
  subject_id       uuid references public.subjects (id) on delete cascade,
  topic_id         uuid references public.topics (id) on delete set null,
  exercise_type_id uuid references public.exercise_types (id) on delete set null,
  kind             public.study_task_kind not null default 'estudiar',
  title            text not null check (char_length(title) between 1 and 200),
  notes            text,
  done             boolean not null default false,
  done_at          timestamptz,
  position         integer not null default 0
);
create index on public.study_tasks (user_id, day);

-- Avisos: todo lo que se notifica queda aquí (la campana de Hoy los lista).
-- Los que tienen send_at en el futuro son recordatorios programados (p. ej. por Claude).
create table public.notifications (
  like private.owned including all,
  kind    text not null,                       -- clave de NOTIFICATIONS en constants.ts, o "resumen"
  title   text not null check (char_length(title) between 1 and 200),
  body    text,
  url     text,
  send_at timestamptz not null default now(),  -- cuándo debe llegar
  sent_at timestamptz,                         -- cuándo se mandó el push (null = pendiente)
  read_at timestamptz
);
create index on public.notifications (user_id, send_at desc);

select private.setup_owned_table(t)
from unnest(array['public.study_tasks', 'public.notifications']::regclass[]) as t;
