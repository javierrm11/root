-- ════════════════════════════════════════════════════════════════════
-- root · Fase 5 — IA (Gemini), revisión semanal, ajustes y notificaciones push
-- El servidor MCP para Claude no necesita tablas: usa las del resto de fases.
-- ════════════════════════════════════════════════════════════════════

-- Resumen de cada tema generado con Gemini
alter table public.topics
  add column summary    text,
  add column summary_at timestamptz;

-- Preferencias (una fila por usuario)
create table public.settings (
  like private.owned including all,
  ai            jsonb not null default '{"resumen": true, "flashcards": true, "revision": true}',
  notifications jsonb not null default '{"estudio": true, "contenido": true, "facturas": true, "domingo": true, "gym": false}',
  unique (user_id)
);

-- Suscripciones Web Push (una por dispositivo)
create table public.push_subscriptions (
  like private.owned including all,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text
);

-- Revisión semanal: números de la semana y lo que propone Gemini
create table public.weekly_reviews (
  like private.owned including all,
  week_start date not null, -- lunes de la semana revisada
  stats      jsonb not null,
  summary    text,
  good       text[] not null default '{}',
  improve    text[] not null default '{}',
  plan       jsonb not null default '[]', -- [{ title, day, category, added }]
  unique (user_id, week_start)
);

select private.setup_owned_table(t)
from unnest(array['public.settings', 'public.push_subscriptions', 'public.weekly_reviews']::regclass[]) as t;
