-- ════════════════════════════════════════════════════════════════════
-- root · Fase 2 — Proyectos y freelance
-- Mismo patrón que la fase 1: plantilla private.owned + private.setup_owned_table.
-- Sin IVA ni IRPF: el usuario no está dado de alta como autónomo.
-- ════════════════════════════════════════════════════════════════════

-- ─── Enums (deben coincidir con src/lib/constants.ts) ───────────────
create type public.project_status   as enum ('propuesta', 'en_curso', 'pausado', 'entregado');
create type public.feature_column   as enum ('idea', 'todo', 'doing', 'done');
create type public.level            as enum ('bajo', 'medio', 'alto');
create type public.invoice_status   as enum ('emitida', 'cobrada', 'vencida');
create type public.expense_category as enum ('software', 'equipo', 'web', 'diseno', 'formacion', 'otro');

-- Puntuación 1–10 de cada criterio de una idea
create domain public.score10 as smallint not null default 5 check (value between 1 and 10);

-- ─── Clientes (mini CRM) ────────────────────────────────────────────
create table public.clients (
  like private.owned including all,
  name         text not null check (char_length(name) between 1 and 120),
  contact_name text,
  contact      text, -- email, teléfono, WhatsApp…
  notes        text,
  last_contact date
);

-- ─── Proyectos (portfolio y trabajos en marcha) ─────────────────────
create table public.projects (
  like private.owned including all,
  client_id   uuid references public.clients (id) on delete set null, -- null = proyecto propio
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  status      public.project_status not null default 'en_curso',
  budget      numeric(10, 2) check (budget >= 0),
  start_date  date,
  end_date    date,
  tech        text[] not null default '{}',
  website     text,
  repo_url    text,
  tone        public.tone not null default 'acc',
  pattern     public.cover_pattern not null default 'grid',
  glyph       text check (char_length(glyph) <= 4),
  cover_path  text
);
create index on public.projects (client_id);

-- Features del proyecto, en columnas tipo Kanban
create table public.project_features (
  like private.owned including all,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 160),
  col        public.feature_column not null default 'todo',
  impact     public.level not null default 'medio',
  effort     public.level not null default 'medio',
  position   integer not null default 0
);
create index on public.project_features (project_id, col);

-- Horas trabajadas (apuntadas a mano, sin cronómetro)
create table public.time_entries (
  like private.owned including all,
  project_id uuid not null references public.projects (id) on delete cascade,
  day        date not null,
  hours      numeric(5, 2) not null check (hours > 0 and hours <= 24),
  note       text
);
create index on public.time_entries (project_id, day);
create index on public.time_entries (user_id, day);

-- Ideas de proyecto puntuadas con 7 criterios (pesos en src/lib/constants.ts)
create table public.ideas (
  like private.owned including all,
  title        text not null check (char_length(title) between 1 and 160),
  description  text,
  pain         public.score10, -- dolor del problema
  market       public.score10, -- tamaño de mercado
  monetization public.score10,
  competition  public.score10, -- 10 = poca competencia
  speed        public.score10, -- 10 = MVP muy rápido
  fit          public.score10, -- encaje con tus habilidades
  advantage    public.score10, -- ventaja propia (audiencia, contactos…)
  project_id   uuid references public.projects (id) on delete set null -- si se convirtió en proyecto
);

-- Facturas (solo se registran, no se generan)
create table public.invoices (
  like private.owned including all,
  client_id  uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  number     text,
  concept    text,
  amount     numeric(10, 2) not null check (amount >= 0),
  issue_date date not null,
  due_date   date,
  paid_date  date,
  status     public.invoice_status not null default 'emitida'
);
create index on public.invoices (user_id, issue_date);
create index on public.invoices (project_id);
create index on public.invoices (client_id);

-- Gastos del trabajo freelance
create table public.expenses (
  like private.owned including all,
  day      date not null,
  concept  text not null,
  category public.expense_category not null default 'otro',
  amount   numeric(10, 2) not null check (amount >= 0)
);
create index on public.expenses (user_id, day);

-- ─── RLS + FK + índice por usuario ──────────────────────────────────
select private.setup_owned_table(t)
from unnest(array[
  'public.clients', 'public.projects', 'public.project_features', 'public.time_entries',
  'public.ideas', 'public.invoices', 'public.expenses'
]::regclass[]) as t;
