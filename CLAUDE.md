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
| 6 | **Estudiar con Claude**: Claude lee los PDF por MCP (`leer_archivo`) y prepara tipos de ejercicio, guías y tandas de práctica que se hacen en la app | ✅ hecha |
| 7 | **Rediseño «Widgets suaves»** + **calendario global** + **plan de exámenes** + **avisos** (campana, mañana y tarde) + herramientas MCP para planificar | ✅ hecha |
| — | Alarma nativa (Capacitor + AlarmKit en iOS) | descartada por ahora |

Las siete fases están implementadas. El prototipo de diseño de todas las pantallas está en un artifact de claude.ai.

## Stack

- **Next.js 16.4** (App Router, Turbopack) con `cacheComponents` y `partialPrefetching`. Lee `node_modules/next/dist/docs/` antes de usar APIs de Next: hay cambios importantes respecto a versiones anteriores (`proxy.ts` en vez de `middleware.ts`, `refresh()` de `next/cache`, reglas de `<Suspense>`).
- **React 19.3**, **TypeScript** estricto, **Tailwind CSS 4** (tokens en `src/app/globals.css`).
- **Supabase**: Postgres + Auth (email y contraseña) + Storage (bucket privado `files`). Cliente `@supabase/ssr`.
- **ts-fsrs** para la repetición espaciada de las flashcards. **lucide-react** para iconos. **unpdf** para sacar el texto de los PDF y **react-markdown + KaTeX** para el Markdown con fórmulas.
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
    estudios/(tabs)/      Asignaturas · Plan · Exámenes · Flashcards · Historial (TopNav)
    estudios/asignatura/[id]   dentro de una asignatura (temas tipo Moodle)
    estudios/repasar/[id]      sesión de flashcards
    estudios/ejercicio/[id]    tipo de ejercicio: guía y tandas
    estudios/practica/[id]     tanda de práctica (PracticeLive)
    proyectos/(tabs)/     Proyectos · Ideas · Clientes · Finanzas (TopNav)
    proyectos/proyecto/[id]    ficha, features, horas y facturas de un proyecto
    contenido/(tabs)/     Calendario · Pipeline · Ideas (TopNav)
    contenido/video/[id]       guion, fechas y fase de un vídeo
    gym/(tabs)/           Entreno · Rutinas · Progreso · Cuerpo (TopNav)
    gym/entreno/[id]           entreno en directo (series que se marcan)
    objetivos, revision        se abren desde el avatar de Hoy (Brote)
    calendario                 calendario global (?mes=, ?dia=, ?area=)
    avisos                     la campana: avisos recibidos y programados
  api/mcp/[secret]        servidor MCP para Claude (mcp-handler)
  api/cron/notificaciones avisos por push (vercel.json: ?momento=manana 07:00 UTC y ?momento=tarde 19:00 UTC)
    habitos, bandeja, ajustes  se abren desde el avatar de Hoy
src/components/ui/        primitivas reutilizables (ver abajo)
src/components/layout/    nav-config, PageHeader, BottomNav/SideNav/TopNav, MenuSheet, ThemePicker
src/features/<módulo>/    actions.ts (Server Actions), queries.ts (lecturas), components, logic.ts
src/lib/                  supabase/ (server, client, proxy, owner), actions, form, dates, constants, types, storage,
                          upload, theme, format, collections, ai (Gemini), push (web-push), notify (avisos)
public/sw.js              service worker (solo fallback offline)
```

## Convenciones (importante: no repetir código)

**Lecturas.** Van en `features/*/queries.ts` (`import "server-only"`). Empiezan con `requireUser()` (lib/supabase/server.ts), que devuelve `{ supabase, userId }` o redirige. Para desenvolver respuestas: `.then(must<Tipo[]>)`. Si varias lecturas necesitan lo mismo en la misma petición, envuélvelo en `cache()` de React (como `loadStudyBase`).

**Cache Components.** Todo lo que lee cookies, `params`, `searchParams`, `usePathname()` o la hora actual va **dentro de `<Suspense>`**. El patrón de cada página es: cabecera estática + `<Suspense fallback={<Skeleton/>}><ContenidoAsync/></Suspense>`. Antes de leer la hora actual (`new Date()`, `Date.now()`) hay que llamar a `await io()` de `next/cache`. `requireUser()` ya lo hace, y si una fecha va fuera de una consulta, mira `TodayLabel`. Sin `io()`, la validación de navegación instantánea de `next dev` muestra el error "unstable value Date.now()", porque al hacer el prefetch las cookies están disponibles y no detienen el prerender. Ejecuta `npm run build` tras cambios en rutas: es lo que detecta estos errores.

**Carga instantánea (precarga con datos).** Cada pantalla tiene su componente async de contenido con
`"use cache: private"` + `cacheLife("pantalla")` (perfil de next.config.ts: 5 min en el navegador). Con `stale` ≥ 5 min,
los datos entran en el App Shell que precargan los enlaces visibles (barra inferior, menú, pestañas), así que al pulsar
la pantalla sale ya con datos.
- **Pantallas nuevas: sigue el mismo patrón.** Si usa `params` o `searchParams`, léelos en un componente de fuera y pasa los valores (strings) a un `…View` cacheado (mira `SubjectView` o `CalendarView`). Haz lo mismo con los chips async de las cabeceras.
- Los enlaces a fichas concretas (asignatura, proyecto, tipo de ejercicio, vídeo, y `Row` con `href`) llevan `prefetch` para precargar también sus datos.
- No hay que invalidar nada a mano: `refresh()` (dentro de `mutate()`) vacía la caché del navegador tras cada acción.
- `RefreshOnReturn` (en `(app)/layout.tsx`) recarga al volver a la app tras más de 1 min fuera, para ver lo que haya cambiado Claude por MCP.
- Las sesiones en directo (repaso, entreno, práctica) guardan con `refreshRoute: false` y usan `useRefreshOnLeave` (lib): si se guardó algo, refrescan al salir.
- `experimental.staleTimes` mantiene además 5 min las páginas ya visitadas.
- Las consultas de `features/*/queries.ts` **no** llevan la caché: las reutilizan el MCP y el cron.

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

- **Estilo «Widgets suaves»** (elegido por el usuario el 25 nov 2026; sustituye a la antigua estructura B): fondo gris claro con **tarjetas blancas redondeadas** (22 px) y sombra suave, como los widgets del iPhone. Fuente **Plus Jakarta Sans**, títulos en extrabold. El prototipo está en https://claude.ai/artifact/KikFHy7pYgwd9nSqKL2ykk (estilo 1).
  - `Section` es una tarjeta (`bg-surface`, `rounded-[22px]`, `shadow-[var(--shadow)]`) con el título en 17 px.
  - `StatRow` son mini widgets; `TopNav` es un control segmentado (la pestaña activa en blanco sobre gris); `LinkPills` son pastillas redondas.
  - **Brote** (`components/ui/brote.tsx`) es la mascota: un brote con hojas, con tres ánimos (`feliz`, `celebra`, `piensa`). Sale en la cabecera de Hoy (abre el menú), en el menú lateral, en los avisos vacíos y en el icono de la app (`lib/app-icon.tsx`). Nada de estilo terminal (`>_`): no es legible para el usuario.
- **Paletas**: la de por defecto es **azul en modo claro** (`azul`, igual que el prototipo). Siguen las otras 5 (grafito, índigo, océano, bosque, ciruela), cada una con claro y oscuro. `--shadow` solo existe en claro. Se aplican como `data-palette` y `data-mode` en `<html>`; el script de `lib/theme.ts` las pone antes del primer pintado. Ajustes cambia la paleta y `ThemeToggle` (sol/luna, en Hoy y Calendario) cambia rápido entre claro y oscuro.
- Usa siempre tokens de Tailwind (`bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-muted`, `bg-accent`/`text-ink`, `text-acc`, `text-study|work|content|gym`) y tonos con `tone-*` + `.chip`/`.dot`/`.tinted`. **Nunca colores hex sueltos** (la única excepción es el rojo del contador de la campana).
- Mobile-first para iPhone: áreas seguras (`env(safe-area-inset-*)`), inputs de 16px, zonas táctiles de 44px o más, `<dialog>` nativo para los sheets.
- **Tablet y ordenador**:
  - Marco de la app (`(app)/layout.tsx`): en el móvil la página hace scroll normal y `BottomNav` va `fixed` abajo, con `pb-[var(--nav-inset)]` (`max(safe-area-inset-bottom − 18px, 6px)`, en globals.css); desde `md` el marco es fijo y solo hace scroll el contenido. La barra de estado de iOS usa `statusBarStyle: "default"`, pintada con `theme-color` (el script del tema la pone al fondo de la paleta guardada). **No uses `black-translucent`**: con ese estilo, WebKit acorta la ventana de la PWA el alto de la barra de estado, no pinta nada por debajo y la barra inferior queda subida.
  - Desde `md` (tablet), la barra inferior se cambia por `SideNav`: un menú lateral con iconos que en `lg` (ordenador) se muestra completo. Incluye los módulos, los de apoyo (`MENU`: Calendario, Avisos, Hábitos…) y el botón de captura rápida.
  - Los módulos y el menú están definidos una sola vez, en `components/layout/nav-config.ts`.
  - El contenido mide `max-w-[480px]` en móvil, `md:max-w-2xl` en tablet y `lg:max-w-5xl` en ordenador (`xl:max-w-6xl` y `2xl:max-w-7xl` en pantallas grandes).
  - `Row` con `href`: toda la fila es enlace y los botones de `trailing` siguen funcionando. Úsalo en vez de poner el `Link` solo en el título.
  - Las pantallas con varias tarjetas usan `<Columns>` (dos columnas desde `lg`; en el móvil se apilan en el mismo orden).
  - Las listas de tarjetas usan la clase `.list-grid` (dos columnas desde `lg`).
  - Los sheets se abren como ventana centrada desde `md`.
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
  - `…_fase5.sql`: `topics.summary`, ajustes, suscripciones push y revisiones semanales;
  - `…_fase6.sql`: texto de los archivos (`study_files.content_md`), tipos de ejercicio, tandas y ejercicios de práctica;
  - `…_fase7.sql`: tareas del plan de exámenes (`study_tasks`) y avisos (`notifications`).
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

## Estudiar con Claude (fase 6)

- **Texto de los archivos** (`features/estudios/file-text.ts`): al subir un PDF o una imagen, `after()` saca el texto y lo guarda en `study_files.content_md`, con marcas `--- Página N ---`.
  - PDF con texto: `unpdf`. Si sale menos de 250 caracteres por página (escaneado o casi todo fórmulas), o es una imagen, lo transcribe Gemini (si hay clave).
  - La pantalla nunca lee `content_md` (`FILE_COLUMNS` y `StudyFileMeta` en queries): puede ser muy largo.
  - El botón de cada archivo lo vuelve a leer (`rereadStudyFile`). `leer_archivo` lo lee en ese momento si aún no estaba, y lo devuelve por trozos de unas 45 000 letras.
- **Método de estudio** (el del usuario): boletín → **tipos de ejercicio** (`exercise_types`) → **guía** de cada tipo (teoría, pasos y ejemplo resuelto, en Markdown) → **tandas** (`practice_sets` + `practice_items`, test o desarrollo, con pista y solución opcionales).
  - Lo genera Claude por MCP: `guardar_tipos_ejercicio`, `guardar_guia`, `crear_practica` y `resultados_practica`. Los esquemas compartidos están en `features/estudios/practice.ts`.
  - Gemini solo puede detectar los tipos de un tema (`detectExerciseTypes` en `ai.ts`, si `settings.ai.practica` está activo). Las guías y las tandas son solo de Claude: el usuario no quiere botones de Gemini en el tipo de ejercicio ni en la tanda.
  - La app tiene botones "Pedir a Claude" que copian el mensaje que hay que pegarle (`CLAUDE_PROMPTS` en logic.ts).
  - `PracticeLive` guarda cada respuesta al momento. Al terminar, con un 80 % o más (`PASS_RATIO`) el tipo pasa a dominado y se propone el siguiente (`nextExerciseType`). El tema sugiere su dominio según los tipos dominados (`suggestedMastery`).
- **Markdown**: `components/ui/markdown.tsx` (react-markdown, GFM y KaTeX) con estilos `.md` en globals.css. Es un Server Component: en las pantallas de cliente se pasa ya pintado como `ReactNode`.

## Plan de exámenes, calendario y avisos (fase 7)

- **Pantalla Hoy** (estilo 1): cabecera con Brote (abre el menú), fecha, sol/luna y campana con los no leídos; lo que dice Brote (lo siguiente del plan, las atrasadas o la cuenta atrás); la semana con puntos por área (enlaza al calendario); widgets (examen, racha, gym, contenido, hábitos); «Tu plan de hoy»; agenda; contenido; hábitos; freelance y objetivos.
- **Plan de exámenes** (`study_tasks`, pestaña Estudios › Plan): tareas por día **sin horas**, cada una con tipo (`STUDY_TASK_KINDS`: estudiar, ejercicios, repasar, flashcards, simulacro, otro) y enlazada a su asignatura, tema o tipo de ejercicio.
  - Lo crea Claude por MCP (`crear_plan_estudio`, con el prompt «Pedir el plan a Claude» de `CLAUDE_PROMPTS.plan`), o se añaden tareas a mano.
  - **Reorganizar lo atrasado** (`rescheduleOverdue` en logic.ts): cada tarea atrasada va al día con menos carga entre hoy y el día antes del examen de su asignatura (o la próxima semana si no hay examen).
  - Lo común a la app y al MCP está en `features/estudios/plan.ts`.
- **Calendario global** (`/calendario`, `features/calendario/queries.ts`): `getCalendarItems(desde, hasta)` junta exámenes, tareas del plan, bloques de agenda, grabar/editar/publicar, entrenos, rutinas previstas, facturas que vencen y entregas de proyectos, con un área (`CALENDAR_AREAS`) cada uno. Lo usan la pantalla, la semana de Hoy y `ver_calendario`.
- **Avisos** (`lib/notify.ts`, tabla `notifications`): todo aviso se guarda (la campana de Hoy y `/avisos` los listan) y se manda por push cuando toca.
  - `notify()` guarda y manda ya; `queueNotifications()` + `deliverDue()` es lo que usa el cron. Un aviso con `send_at` futuro (los de `enviar_aviso` de Claude) sale en la siguiente pasada.
  - Tipos en `NOTIFICATIONS` (constants), con su interruptor en Ajustes: estudio, plan, exámenes (a 30, 14, 7, 3 y 1 día), contenido, facturas, gym, racha en peligro, lo de mañana, domingo, Claude y «No molestar de noche» (de 23:00 a 8:00 no se manda nada; el cron de la mañana lo manda).
  - El cron corre dos veces al día (Vercel Hobby solo permite crons diarios): mañana (resumen, plan, cuenta atrás, facturas) y tarde (racha en peligro o lo que queda del plan, y lo de mañana).

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
  - Si `run` devuelve un string, se manda tal cual (p. ej. `leer_archivo`); si no, como JSON.
  - Planificar: `ver_calendario`, `crear_plan_estudio`, `ver_plan`, `replanificar`, `borrar_plan`, `mover` (tarea o bloque), `borrar` (tarea, bloque o aviso), `marcar_hecho` (tarea, bloque o hábito) y `enviar_aviso` (ya o programado). `crear_practica` y `crear_plan_estudio` avisan al móvil.
  - Las rutas que llaman a Gemini o leen PDF escaneados exportan `maxDuration = 300`.
  - La ruta `api/mcp/[secret]` responde 404 si el secreto no coincide.
- **Push**:
  - `sendPush` en `lib/push.ts`; las suscripciones van en `push_subscriptions` y se activan desde Ajustes (`PushSetup`).
  - Los avisos y el cron de mañana y tarde están en la sección de la fase 7. El de la mañana también marca como vencidas las facturas pasadas de fecha.
  - El service worker (`public/sw.js`) muestra la notificación y abre la URL al tocarla.
  - En iPhone solo funciona con la PWA instalada.
- `/api/*` está fuera del `proxy.ts`: cada ruta hace su propia autenticación.

## Decisiones tomadas con el usuario

- La app es solo para él: no hace falta multiusuario. Los registros públicos deben estar desactivados en Supabase.
- IA: Gemini dentro de la app y un servidor MCP para que Claude (su suscripción de claude.ai) lea y escriba los datos.
- Los mejores días y horas para publicar en TikTok se le preguntan a Claude por MCP; no se calculan en la app.
- Navegación: bottom nav con 5 módulos y header propio en cada módulo. En Estudios, las pestañas van arriba del todo. Sin buscador en Estudios.
