@AGENTS.md

# root — app personal para organizar la vida

PWA de **un solo usuario** (el dueño, en iPhone) para organizar estudios, freelance, contenido de TikTok y gimnasio. La interfaz, los textos y los comentarios van **en español**.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base (login, diseño, PWA, bottom nav, Hoy, captura rápida) + **Estudios** completo | ✅ hecha |
| 2 | Proyectos y freelance: portfolio, CRM de clientes, ideas puntuadas, features en Kanban, €/hora, IVA/IRPF | pendiente |
| 3 | Contenido (TikTok): banco de ideas, pipeline, calendario, métricas | pendiente |
| 4 | Gym + Objetivos trimestrales conectados a los módulos | pendiente |
| 5 | IA: Gemini en la app, servidor MCP para Claude, revisión semanal, notificaciones push | pendiente |
| — | Alarma nativa (Capacitor + AlarmKit en iOS) | descartada por ahora |

Las pantallas de fases futuras existen como `ComingSoon` (`/proyectos`, `/contenido`, `/gym`, `/objetivos`, `/revision`).

## Stack

- **Next.js 16.4** (App Router, Turbopack) con `cacheComponents` y `partialPrefetching`. Lee `node_modules/next/dist/docs/` antes de usar APIs de Next: hay cambios importantes respecto a versiones anteriores (`proxy.ts` en vez de `middleware.ts`, `refresh()` de `next/cache`, reglas de `<Suspense>`).
- **React 19.3**, **TypeScript** estricto, **Tailwind CSS 4** (tokens en `src/app/globals.css`).
- **Supabase**: Postgres + Auth (email y contraseña) + Storage (bucket privado `files`). Cliente `@supabase/ssr`.
- **ts-fsrs** para la repetición espaciada de las flashcards. **lucide-react** para iconos.
- No se usa shadcn/ui: hay primitivas propias en `src/components/ui`.

## Comandos

```bash
npm run dev     # desarrollo en http://localhost:3000
npm run build   # build de producción (valida las reglas de Cache Components)
npm run lint
npx tsc --noEmit
```

Variables en `.env` (plantilla en `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `GEMINI_API_KEY` (esta última para la fase 5).

## Estructura

```
supabase/migrations/      SQL de la base de datos (una migración por fase)
src/proxy.ts              refresca la sesión y redirige a /login sin sesión
src/app/
  layout.tsx              fuentes, script de tema, registro del service worker
  manifest.ts, icon.tsx, apple-icon.tsx, pwa/[size]   PWA
  login/                  login y signOut
  offline/                página que sirve el service worker sin conexión
  (app)/                  todo lo que va tras login, con bottom nav + botón +
    page.tsx              Hoy
    estudios/(tabs)/      Asignaturas · Exámenes · Flashcards · Historial (TopNav)
    estudios/asignatura/[id]   dentro de una asignatura (temas tipo Moodle)
    estudios/repasar/[id]      sesión de flashcards
    habitos, bandeja, ajustes  se abren desde el avatar de Hoy
src/components/ui/        primitivas reutilizables (ver abajo)
src/components/layout/    PageHeader, BottomNav/TopNav, MenuSheet, ComingSoon, ThemePicker
src/features/<módulo>/    actions.ts (Server Actions), queries.ts (lecturas), components, logic.ts
src/lib/                  supabase/, actions, form, dates, constants, types, storage, upload, theme
public/sw.js              service worker (solo fallback offline)
```

## Convenciones (importante: no repetir código)

**Lecturas.** Van en `features/*/queries.ts` (`import "server-only"`). Empiezan con `requireUser()` (lib/supabase/server.ts), que devuelve `{ supabase, userId }` o redirige. Para desenvolver respuestas: `.then(must<Tipo[]>)`. Si varias lecturas necesitan lo mismo en la misma petición, envuélvelo en `cache()` de React (como `loadStudyBase`).

**Cache Components.** Todo lo que lee cookies, `params`, `searchParams`, `usePathname()` o la hora actual va **dentro de `<Suspense>`**. El patrón de cada página es: cabecera estática + `<Suspense fallback={<Skeleton/>}><ContenidoAsync/></Suspense>`. Las fechas en zonas estáticas usan `connection()` (ver `TodayLabel`). Ejecuta `npm run build` tras cambios en rutas: es lo que detecta estos errores.

**Escrituras.** Server Actions en `features/*/actions.ts` con `"use server"`, siempre a través de `mutate()` (lib/actions.ts): autentica, devuelve `{ error }` al formulario y llama a `refresh()`. Para validar usa `invalid("mensaje")`. Para leer el FormData usa `lib/form.ts` (`text`, `optText`, `optInt`, `oneOf`, `uploadedFile`). Hay acciones genéricas en `features/common/actions.ts`: `deleteRow(table, id)` y `setFlag(table, id, done)`. Úsalas antes de crear otras.

**Formularios y botones.**
- `FormSheet`: bottom sheet con formulario. Sirve para crear y editar. Si recibe `upload`, sube el archivo a Storage desde el navegador antes de la acción.
- Los campos compartidos entre crear y editar van en un componente `*Fields` (p. ej. `features/estudios/components/fields.tsx`).
- `ActionButton`: ejecuta una acción ya enlazada (`accion.bind(null, id)`), con `confirm` opcional para borrar.
- `CheckRow`: fila con check. `InlineAdd`: campo y botón para añadir a una lista. `ChoicePills`: radios con forma de pastilla.

**UI.**
- Primitivas en `components/ui/primitives.tsx`: `Section`, `Row`, `RowList`, `Stat`, `StatRow`, `Chip`, `Dot`, `ProgressBar`, `TimelineItem`, `EmptyState` y `Skeleton`.
- Los iconos se pasan por nombre: `<Icon name="book" />`. Para añadir uno, mételo en el mapa de `icon.tsx`.

**Catálogos.** Los enums (tipos de archivo, examen, categorías…) viven en `src/lib/constants.ts` con su etiqueta y su tono, y **deben coincidir** con los enums de Postgres en la migración. `toOptions()` los convierte en opciones de `<select>` o de pastillas.

**Fechas.** Las fechas de calendario son strings `YYYY-MM-DD`. "Hoy" es `todayISO()` en `Europe/Madrid` (`APP_TIMEZONE`). Usa los helpers de `lib/dates.ts`, nunca `new Date()` suelto para fechas de calendario.

## Diseño

- **Estructura B, "lista y timeline"**: secciones planas separadas por líneas finas, títulos pequeños en mayúsculas (`section-title`), agenda e historial en timeline, bottom nav clásica con etiquetas y botón + cuadrado redondeado. Columna móvil de `max-w-[480px]`.
- **5 paletas** (grafito, índigo, océano, bosque, ciruela), cada una con modo oscuro suave y claro. La de por defecto es **grafito y lima en oscuro**. Se aplican como `data-palette` y `data-mode` en `<html>`; el script de `lib/theme.ts` las pone antes del primer pintado, y Ajustes las guarda en localStorage.
- Usa siempre tokens de Tailwind (`bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-muted`, `bg-accent`/`text-ink`, `text-acc`, `text-study|work|content|gym`) y tonos con `tone-*` + `.chip`/`.dot`/`.tinted`. **Nunca colores hex sueltos.**
- Mobile-first para iPhone: áreas seguras (`env(safe-area-inset-*)`), inputs de 16px, zonas táctiles de 44px o más, `<dialog>` nativo para los sheets.
- Las skills de diseño instaladas en `.claude/skills` (interface-design, ui-ux-pro-max, mobile-native, etc.) sirven para nuevas pantallas.

## Base de datos

- Migraciones en `supabase/migrations/`. **No edites una migración ya aplicada: crea una nueva** (`YYYYMMDDHHMMSS_descripcion.sql`).
- Patrón para tablas nuevas:
  1. Créalas con `like private.owned including all`, que aporta `id`, `user_id` (default `auth.uid()`) y `created_at`.
  2. Llama a `select private.setup_owned_table('public.tabla')`, que añade FK, índice, RLS y la política de propietario.
  3. Refleja la fila en `src/lib/types.ts`.
- Storage: bucket privado `files`, rutas `{user_id}/subjects/{subject_id}/…`, `{user_id}/covers/…` y `{user_id}/education/…`. Se leen con URLs firmadas (`signPaths`) y se borran con `removePaths` al eliminar la fila.
- Las flashcards guardan el estado FSRS completo en `fsrs` (jsonb) y la próxima fecha en `due`.

## Estudios (cómo funciona)

- **Asignaturas** tipo Moodle: portada (foto subida o patrón generado + símbolo), código, curso y cuatrimestre.
- Dentro de cada asignatura hay una sección **General** (guía docente…) y **Temas** desplegables. Cada tema tiene:
  - dominio 0–5;
  - archivos: PDF de teoría, boletines con estado (pendiente → en curso → hecho) y otros;
  - checklist de contenidos.
- Estado de un tema (`logic.ts`): Dominado (≥4), Repasar (2–3), Prioridad (≤1 con archivos) o Sin empezar.
- **Cuándo empezar a estudiar** (`startAdvice`): `(5 − dominio) × 1,5 h` por tema, a 2 h al día, más 2 días de repaso.
- **Toca estudiar** (en Hoy): ordena los temas por `(5 − dominio) / días hasta el examen`.

## Decisiones tomadas con el usuario

- La app es solo para él: no hace falta multiusuario. Los registros públicos deben estar desactivados en Supabase.
- IA: Gemini dentro de la app y un servidor MCP para que Claude (su suscripción de claude.ai) lea y escriba los datos.
- Los mejores días y horas para publicar en TikTok se le preguntan a Claude por MCP; no se calculan en la app.
- Navegación: bottom nav con 5 módulos y header propio en cada módulo. En Estudios, las pestañas van arriba del todo. Sin buscador en Estudios.
