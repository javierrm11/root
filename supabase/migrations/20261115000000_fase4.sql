-- ════════════════════════════════════════════════════════════════════
-- root · Fase 4 — Gym y objetivos del trimestre
-- ════════════════════════════════════════════════════════════════════

-- ─── Enums (deben coincidir con src/lib/constants.ts) ───────────────
create type public.photo_angle as enum ('frente', 'perfil', 'espalda');
create type public.goal_metric as enum
  ('manual', 'subject_mastery', 'exercise_record', 'videos_published', 'new_clients', 'freelance_hours');

-- ─── Ejercicios y rutinas ───────────────────────────────────────────
create table public.exercises (
  like private.owned including all,
  name         text not null check (char_length(name) between 1 and 80),
  muscle_group text,
  unique (user_id, name)
);

create table public.routines (
  like private.owned including all,
  name     text not null check (char_length(name) between 1 and 60),
  weekdays smallint[] not null default '{}', -- 0 = lunes … 6 = domingo
  notes    text
);

create table public.routine_exercises (
  like private.owned including all,
  routine_id  uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position    integer not null default 0,
  sets        smallint not null default 3 check (sets between 1 and 20),
  reps        text not null default '8', -- "8", "6-8", "fallo"
  rest_s      smallint check (rest_s between 0 and 900)
);
create index on public.routine_exercises (routine_id, position);

-- ─── Entrenos y series ──────────────────────────────────────────────
create table public.workouts (
  like private.owned including all,
  routine_id  uuid references public.routines (id) on delete set null,
  day         date not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  notes       text
);
create index on public.workouts (user_id, day);

create table public.workout_sets (
  like private.owned including all,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  set_no      smallint not null,
  weight_kg   numeric(6, 2) check (weight_kg >= 0),
  reps        smallint check (reps between 0 and 200),
  done        boolean not null default false
);
create index on public.workout_sets (workout_id);
create index on public.workout_sets (exercise_id);

-- ─── Cuerpo: peso, medidas y fotos ──────────────────────────────────
create table public.body_metrics (
  like private.owned including all,
  day       date not null,
  weight_kg numeric(5, 2) check (weight_kg > 0),
  chest_cm  numeric(5, 1),
  waist_cm  numeric(5, 1),
  arm_cm    numeric(5, 1)
);
create index on public.body_metrics (user_id, day);

create table public.progress_photos (
  like private.owned including all,
  day          date not null,
  angle        public.photo_angle not null,
  storage_path text not null unique
);

-- ─── Objetivos del trimestre conectados a los módulos ───────────────
create table public.goals (
  like private.owned including all,
  title        text not null check (char_length(title) between 1 and 120),
  metric       public.goal_metric not null default 'manual',
  ref_id       uuid, -- asignatura (subject_mastery) o ejercicio (exercise_record)
  target       numeric(10, 2) not null check (target > 0),
  manual_value numeric(10, 2) not null default 0,
  start_date   date not null,
  end_date     date not null,
  check (end_date >= start_date)
);

-- ─── RLS + FK + índice por usuario ──────────────────────────────────
select private.setup_owned_table(t)
from unnest(array[
  'public.exercises', 'public.routines', 'public.routine_exercises', 'public.workouts',
  'public.workout_sets', 'public.body_metrics', 'public.progress_photos', 'public.goals'
]::regclass[]) as t;
