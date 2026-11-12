-- ════════════════════════════════════════════════════════════════════
-- root · Fase 3 — Contenido (TikTok)
-- Sin métricas ni puntuación de ideas (decisión del usuario).
-- ════════════════════════════════════════════════════════════════════

-- ─── Enums (deben coincidir con src/lib/constants.ts) ───────────────
create type public.video_stage  as enum ('guion', 'grabar', 'editar', 'programado', 'publicado');
create type public.video_format as enum
  ('tutorial', 'explicacion', 'reto', 'comparativa', 'storytime', 'setup', 'lista', 'opinion', 'vlog', 'tendencia');

-- ─── Banco de ideas de vídeo ────────────────────────────────────────
create table public.content_ideas (
  like private.owned including all,
  title    text not null check (char_length(title) between 1 and 160),
  hook     text,
  format   public.video_format not null default 'tutorial',
  hashtags text,
  notes    text
);

-- ─── Vídeos: pipeline, fechas y guion ───────────────────────────────
create table public.videos (
  like private.owned including all,
  idea_id      uuid references public.content_ideas (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 160),
  format       public.video_format not null default 'tutorial',
  series       text,
  stage        public.video_stage not null default 'guion',
  record_date  date,
  edit_date    date,
  publish_date date,
  publish_time time,
  duration_s   smallint check (duration_s between 1 and 600),
  sound        text,
  hashtags     text,
  hook         text, -- gancho de los primeros 3 segundos
  body         text, -- desarrollo
  cta          text, -- llamada a la acción
  notes        text
);
create index on public.videos (user_id, stage);
create index on public.videos (user_id, record_date);
create index on public.videos (user_id, edit_date);
create index on public.videos (user_id, publish_date);

-- ─── Ventanas recomendadas para publicar ────────────────────────────
-- Las rellenará Claude por MCP (fase 5); de momento se añaden a mano.
create table public.publish_windows (
  like private.owned including all,
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = lunes
  start_time time not null,
  end_time   time not null,
  note       text,
  check (end_time > start_time)
);

-- ─── RLS + FK + índice por usuario ──────────────────────────────────
select private.setup_owned_table(t)
from unnest(array['public.content_ideas', 'public.videos', 'public.publish_windows']::regclass[]) as t;
