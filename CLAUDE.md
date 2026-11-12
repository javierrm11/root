@AGENTS.md

# root — app personal para organizar la vida

PWA de **un solo usuario** (el dueño, en iPhone) para organizar estudios, freelance, contenido de TikTok y gimnasio. La interfaz, los textos y los comentarios van **en español**.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base (login, diseño, PWA, bottom nav, Hoy, captura rápida) + **Estudios** completo | ✅ hecha |
| 2 | **Proyectos** y freelance: proyectos con features por columnas, horas apuntadas a mano, ideas puntuadas, clientes, facturas registradas, gastos, €/hora real | ✅ hecha |
| 3 | **Contenido** (solo TikTok, nicho programación e IA): calendario de grabar, editar y publicar; pipeline; guion; ideas; ventanas de publicación. Sin métricas ni puntuación de ideas | ✅ hecha |
| 4 | **Gym** (entreno en directo, rutinas, progreso, cuerpo) + **Objetivos** del trimestre conectados a los módulos | ✅ hecha |
| 5 | **IA**: Gemini (resumen y flashcards por tema, revisión semanal), **servidor MCP** para Claude, **notificaciones push** con resumen diario, Ajustes | ✅ hecha |
| — | Alarma nativa (Capacitor + AlarmKit en iOS) | descartada por ahora |

Las cinco fases están implementadas. El prototipo de diseño de todas las pantallas está en un artifact de claude.ai.

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

Variables en `.env` (plantilla en `.env.example`):

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | IA; el modelo por defecto es `gemini-flash-latest` |
| `ROOT_EMAIL`, `ROOT_PASSWORD` | El MCP y el cron entran como el dueño |
| `MCP_SECRET` | Forma parte de la URL del conector: `/api/mcp/<secreto>` |
| `CRON_SECRET` | Vercel Cron lo manda en `Authorization: Bearer …` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push; se generan con `npx web-push generate-vapid-keys` |

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
    proyectos/(tabs)/     Proyectos · Ideas · Clientes · Finanzas (TopNav)
    proyectos/proyecto/[id]    ficha, features, horas y facturas de un proyecto
    contenido/(tabs)/     Calendario · Pipeline · Ideas (TopNav)
    contenido/video/[id]       guion, fechas y fase de un vídeo
    gym/(tabs)/           Entreno · Rutinas · Progreso · Cuerpo (TopNav)
    gym/entreno/[id]           entreno en directo (series que se marcan)
    objetivos, revision        se abren desde el avatar de Hoy
  api/mcp/[secret]        servidor MCP para Claude (mcp-handler)
  api/cron/notificaciones resumen diario por push (vercel.json, 07:00 UTC)
    habitos, bandeja, ajustes  se abren desde el avatar de Hoy
src/components/ui/        primitivas reutilizables (ver abajo)
src/components/layout/    PageHeader, BottomNav/TopNav, MenuSheet, ComingSoon, ThemePicker
src/features/<módulo>/    actions.ts (Server Actions), queries.ts (lecturas), components, logic.ts
src/lib/                  supabase/ (server, client, proxy, owner), actions, form, dates, constants, types, storage,
                          upload, theme, format, collections, ai (Gemini), push (web-push)
public/sw.js              service worker (solo fallback offline)
```

## Convenciones (importante: no repetir código)

**Lecturas.** Van en `features/*/queries.ts` (`import "server-only"`). Empiezan con `requireUser()` (lib/supabase/server.ts), que devuelve `{ supabase, userId }` o redirige. Para desenvolver respuestas: `.then(must<Tipo[]>)`. Si varias lecturas necesitan lo mismo en la misma petición, envuélvelo en `cache()` de React (como `loadStudyBase`).

**Cache Components.** Todo lo que lee cookies, `params`, `searchParams`, `usePathname()` o la hora actual va **dentro de `<Suspense>`**. El patrón de cada página es: cabecera estática + `<Suspense fallback={<Skeleton/>}><ContenidoAsync/></Suspense>`. Antes de leer la hora actual (`new Date()`, `Date.now()`) hay que llamar a `await io()` de `next/cache`. `requireUser()` ya lo hace, y si una fecha va fuera de una consulta, mira `TodayLabel`. Sin `io()`, la validación de navegación instantánea de `next dev` muestra el error "unstable value Date.now()", porque al hacer el prefetch las cookies están disponibles y no detienen el prerender. Ejecuta `npm run build` tras cambios en rutas: es lo que detecta estos errores.

**Escrituras.** Server Actions en `features/*/actions.ts` con `"use server"`, siempre a través de `mutate()` (lib/actions.ts): autentica, devuelve `{ error }` al formulario y llama a `refresh()`.
- Para validar usa `invalid("mensaje")`.
- Para "crear o editar" usa `upsert(supabase, tabla, id | null, campos)`.
- Para leer el FormData usa `lib/form.ts`: `text`, `optText`, `optInt`, `optNumber`, `oneOf`, `list` (separado por comas), `coverFields` y `uploadedFile`.
- Al reemplazar o borrar una fila con archivo usa `removeRowFile(supabase, tabla, id, columna)` (lib/storage.ts).
- Hay acciones genéricas en `features/common/actions.ts`: `deleteRow(table, id)` y `setFlag(table, id, done)`. Úsalas antes de crear otras.

**Formularios y botones.**
- `FormSheet`: bottom sheet con formulario. Sirve para crear y editar. Si recibe `upload`, sube el archivo a Storage desde el navegador antes de la acción.
- Los campos compartidos entre crear y editar van en un componente `*Fields` (p. ej. `features/estudios/components/fields.tsx`).
- `ActionButton`: ejecuta una acción ya enlazada (`accion.bind(null, id)`), con `confirm` opcional para borrar.
- `CheckRow`: fila con check. `InlineAdd`: campo y botón para añadir a una lista. `ChoicePills`: radios con forma de pastilla.

**UI.**
- Primitivas en `components/ui/primitives.tsx`: `Section`, `Row`, `RowList`, `Stat`, `StatRow`, `Chip`, `Dot`, `ProgressBar`, `TimelineItem`, `DateBlock`, `LinkPills` (filtros con `?param=`, con contador opcional), `Steps` (progreso por fases), `EmptyState` y `Skeleton`.
- Calendario mensual genérico en `components/ui/month-calendar.tsx`: `MonthCalendar` con marcas por día (`dots`, `filled`, `ring`) y días enlazables. Lo usan Exámenes y Contenido.
- Las portadas de asignaturas y proyectos usan `CoverArt` y `CoverFields` (`components/ui/cover-art.tsx`), y el tipo `Cover` en lib/types.
- Para números usa `lib/format.ts` (`formatMoney`, `formatPerHour`, `formatHours`, `ratio`) y para listas `lib/collections.ts` (`groupBy`, `sum`).
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
- Hay una migración por fase:
  - `…_fase1.sql`: base, Hoy y Estudios;
  - `…_fase2.sql`: clientes, proyectos, features, horas, ideas, facturas y gastos;
  - `…_fase3.sql`: ideas de contenido, vídeos y ventanas de publicación;
  - `…_fase4.sql`: ejercicios, rutinas, entrenos, series, medidas, fotos y objetivos;
  - `…_fase5.sql`: `topics.summary`, ajustes, suscripciones push y revisiones semanales.
- Storage: bucket privado `files`, rutas `{user_id}/subjects/{subject_id}/…`, `{user_id}/covers/…` (portadas de asignaturas y proyectos) y `{user_id}/education/…`. Se leen con URLs firmadas (`signPaths`) y se borran con `removePaths` al eliminar la fila.
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

## Proyectos (cómo funciona)

- Pestañas: **Proyectos** (en marcha y terminados), **Ideas**, **Clientes** y **Finanzas**.
- Cada proyecto tiene:
  - cliente (o es un proyecto propio), estado, presupuesto, tecnologías y enlaces;
  - features en 4 columnas (Idea → Por hacer → En curso → Hecho), con impacto y esfuerzo;
  - horas, que se **apuntan a mano** (sin cronómetro, decisión del usuario);
  - facturas.
- **€/hora real** = ingresos ÷ horas. Los ingresos son lo facturado, o el presupuesto si aún no hay facturas (`projectIncome` en logic.ts).
- **Ideas**: 7 criterios del 1 al 10 (`IDEA_CRITERIA` en constants, con peso 3 o 2). La nota es la media ponderada (`ideaScore`). "Convertir en proyecto" crea un proyecto en estado "propuesta".
- **Finanzas**: facturado, cobrado, por cobrar, gastos, beneficio, horas y €/hora del periodo (mes, trimestre o año, con `?periodo=`).
  - Las facturas **solo se registran**, no se generan PDF.
  - **Sin IVA ni IRPF**: el usuario no es autónomo. Si se da de alta, hay que añadir las estimaciones de los modelos 303 y 130.
- En **Hoy** aparecen las facturas pendientes y los proyectos con features en curso.

## Contenido (cómo funciona)

- Solo **TikTok**; el nicho es programación e IA. **Sin métricas ni puntuación de ideas** (decisión del usuario).
- **Pipeline** de cada vídeo: Guion → Grabar → Editar → Programado → Publicado (`VIDEO_STAGES`).
- Cada vídeo tiene:
  - fechas de grabar, editar y publicar (`VIDEO_TASKS`) y hora de publicación;
  - guion: gancho de 0–3 s, desarrollo y llamada a la acción;
  - formato, serie, sonido y hashtags.
- **Calendario** (`?mes=` y `?dia=`): puntos por tarea y borde en los días con ventana recomendada (`publish_windows`, con lunes = 0). Las ventanas las rellenará Claude por MCP en la fase 5; mientras, se añaden a mano.
- **Ideas**: título, gancho, formato y hashtags. "Pasar a guion" crea el vídeo enlazado (`idea_id`).
- En **Hoy** aparecen las tareas de hoy y lo que se publica mañana. La cabecera de Contenido muestra "Hoy: grabar…".

## Gym y objetivos (fase 4)

- **Rutinas**: cada una tiene sus días de la semana (`weekdays`, con lunes = 0) y sus ejercicios (series, repeticiones y descanso). Los ejercicios se crean por nombre, con `exerciseId()` en actions.
- **Entreno**: `startWorkout` copia las series de la rutina con el peso de la última vez. En `/gym/entreno/[id]`, `WorkoutLive` guarda cada serie al marcarla o al salir del campo (`saveSet`, sin refrescar la pantalla).
- **Récords**: mejor 1RM estimado con la fórmula de Epley (`estimatedMax`).
- **Progreso**: mejor peso por semana de las últimas 8, con `BarChart` (una sola serie y base en 0).
- **Cuerpo**: peso, medidas y fotos privadas en `{user_id}/gym/`.
- **Objetivos**: `GOAL_METRICS` define de dónde sale el valor: manual, dominio de una asignatura, récord de un ejercicio, vídeos publicados, clientes nuevos u horas freelance. Se calcula solo en `getGoals()`.

## IA, MCP y notificaciones (fase 5)

- **Gemini** (`lib/ai.ts`):
  - `generateText` y `generateJson` (este último con un esquema de zod que se pasa como JSON Schema).
  - `fileParts` manda los PDF de Storage en línea.
  - Usos: resumir un tema (se guarda en `topics.summary`), crear flashcards de un tema (`features/estudios/ai.ts`) y la revisión semanal (`features/revision`).
  - Cada función se activa o desactiva en Ajustes (`settings.ai`).
- **Contexto propietario** (`lib/supabase/owner.ts`): el MCP y el cron no tienen cookies.
  - `runAsOwner()` inicia sesión como el dueño, con `ROOT_EMAIL` y `ROOT_PASSWORD`, solo cuando hace falta.
  - Dentro de ese contexto, `requireUser()` devuelve esa sesión, así que **todas las consultas y Server Actions se reutilizan tal cual** y RLS sigue aplicando.
  - `mutate()` no llama a `refresh()` en ese contexto.
- **MCP** (`features/mcp/tools.ts`):
  - Cada herramienta es `{ name, description, input (zod), run }` y llama a las consultas y acciones existentes.
  - Para añadir una, agrégala a `MCP_TOOLS`; también aparece listada en Ajustes.
  - La ruta `api/mcp/[secret]` responde 404 si el secreto no coincide.
- **Push**:
  - `sendPush` en `lib/push.ts`; las suscripciones van en `push_subscriptions` y se activan desde Ajustes (`PushSetup`).
  - El cron diario arma un resumen según `settings.notifications` y marca como vencidas las facturas pasadas de fecha.
  - El service worker (`public/sw.js`) muestra la notificación y abre la URL al tocarla.
  - En iPhone solo funciona con la PWA instalada.
- `/api/*` está fuera del `proxy.ts`: cada ruta hace su propia autenticación.

## Decisiones tomadas con el usuario

- La app es solo para él: no hace falta multiusuario. Los registros públicos deben estar desactivados en Supabase.
- IA: Gemini dentro de la app y un servidor MCP para que Claude (su suscripción de claude.ai) lea y escriba los datos.
- Los mejores días y horas para publicar en TikTok se le preguntan a Claude por MCP; no se calculan en la app.
- Navegación: bottom nav con 5 módulos y header propio en cada módulo. En Estudios, las pestañas van arriba del todo. Sin buscador en Estudios.
