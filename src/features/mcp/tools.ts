import "server-only";
import { z } from "zod";
import { AGENDA_CATEGORIES, EXAM_KINDS, INBOX_KINDS, PRACTICE_MODES, VIDEO_FORMATS, keysOf } from "@/lib/constants";
import { daysBetween, todayISO } from "@/lib/dates";
import { notify } from "@/lib/notify";
import { requireUser } from "@/lib/supabase/server";
import { createAgendaItem, createInboxItem, moveAgendaItem, toggleHabit } from "@/features/hoy/actions";
import { deleteRow, setFlag } from "@/features/common/actions";
import { getCalendarItems } from "@/features/calendario/queries";
import { getToday } from "@/features/hoy/queries";
import {
  addContent,
  createPractice,
  createStudyTasks,
  deleteStudyTasks,
  moveStudyTask,
  rescheduleStudyPlan,
  saveExam,
  saveExerciseTypes,
  saveGuide,
  setMastery,
  toggleStudyTask,
} from "@/features/estudios/actions";
import { StudyTaskInput } from "@/features/estudios/plan";
import { fileTextForClaude } from "@/features/estudios/file-text";
import { ExerciseTypeInput, PracticeItemInput, loadExerciseType, practiceHistory } from "@/features/estudios/practice";
import { startAdvice } from "@/features/estudios/logic";
import { getExamsView, getStudyPlan, getSubjectDetail, getSubjectsOverview } from "@/features/estudios/queries";
import { logHours } from "@/features/proyectos/actions";
import { getFinances, getProjectsOverview } from "@/features/proyectos/queries";
import { replaceWindows, saveContentIdea } from "@/features/contenido/actions";
import { getContentCalendar, getPipeline } from "@/features/contenido/queries";
import { getGymToday } from "@/features/gym/queries";
import { getGoals } from "@/features/objetivos/queries";
import { getWeekReview } from "@/features/revision/queries";

// Herramientas que ve Claude por MCP. Reutilizan las consultas y Server Actions de la app,
// que se ejecutan como el propietario (ver lib/supabase/owner.ts).

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha YYYY-MM-DD");
const time = z.string().regex(/^\d{2}:\d{2}$/).describe("Hora HH:MM");
const id = z.string().uuid();

/** Convierte argumentos en FormData para reutilizar las Server Actions de los formularios. */
const form = (args: Record<string, unknown>) => {
  const fd = new FormData();
  Object.entries(args).forEach(([key, value]) => value !== undefined && value !== null && fd.set(key, String(value)));
  return fd;
};

type ToolDef<S extends z.ZodObject = z.ZodObject> = {
  name: string;
  description: string;
  input: S;
  run: (args: z.infer<S>) => Promise<unknown>;
};
const tool = <S extends z.ZodObject>(def: ToolDef<S>) => def as unknown as ToolDef;

export const MCP_TOOLS: ToolDef[] = [
  tool({
    name: "resumen_de_hoy",
    description: "Agenda, hábitos, próximo examen, temas prioritarios, freelance y contenido de hoy.",
    input: z.object({}),
    run: () => getToday(),
  }),
  tool({
    name: "estudios",
    description: "Asignaturas con su dominio y próximos exámenes con el consejo de cuándo empezar a estudiar.",
    input: z.object({}),
    run: async () => {
      const [overview, exams] = await Promise.all([getSubjectsOverview(), getExamsView()]);
      return {
        asignaturas: overview.subjects.map((s) => ({ id: s.id, nombre: s.name, codigo: s.code, temas: s.topicCount, dominio_pct: s.pct, proximo_examen: s.nextExam?.exam_date ?? null })),
        examenes: exams.upcoming.map((e) => ({ id: e.id, asignatura: e.subjectName, tipo: e.kind, fecha: e.exam_date, dias: e.days, consejo: startAdvice(exams.today, e.exam_date, e.masteries) })),
      };
    },
  }),
  tool({
    name: "asignatura",
    description:
      "Temas de una asignatura con su dominio (0–5), contenidos, archivos (con su id para leer_archivo), tipos de ejercicio, resúmenes y exámenes.",
    input: z.object({ subject_id: id }),
    run: async ({ subject_id }) => {
      const d = await getSubjectDetail(subject_id);
      return {
        asignatura: d.subject.name,
        temas: d.topics.map((t) => ({
          id: t.id,
          titulo: t.title,
          dominio: t.mastery,
          resumen: t.summary,
          contenidos: t.contents.map((c) => ({ id: c.id, titulo: c.title, hecho: c.done })),
          archivos: t.files.map((f) => ({ id: f.id, nombre: f.name, tipo: f.kind, estado: f.status, leido: Boolean(f.content_source) })),
          tipos_ejercicio: t.exerciseTypes.map((e) => ({
            id: e.id,
            nombre: e.name,
            estado: e.status,
            cantidad: e.count,
            ejercicios: e.examples,
            tiene_guia: Boolean(e.guide),
          })),
        })),
        examenes: d.exams.map((e) => ({ tipo: e.kind, fecha: e.exam_date, dias: e.days, nota: e.grade })),
      };
    },
  }),
  tool({
    name: "crear_bloque_agenda",
    description: "Añade un bloque a la agenda. Úsalo para repartir un plan de estudio, grabaciones, entrenos o trabajo freelance.",
    input: z.object({
      title: z.string().min(1),
      day,
      start_time: time.optional(),
      end_time: time.optional(),
      category: z.enum(keysOf(AGENDA_CATEGORIES)),
      notes: z.string().optional(),
    }),
    run: (args) => createAgendaItem(form(args)),
  }),
  tool({
    name: "actualizar_dominio_tema",
    description: "Cambia el dominio (0–5) de un tema.",
    input: z.object({ topic_id: id, mastery: z.number().int().min(0).max(5) }),
    run: ({ topic_id, mastery }) => setMastery(topic_id, mastery),
  }),
  tool({
    name: "anadir_contenido_tema",
    description: "Añade un contenido a estudiar a la checklist de un tema.",
    input: z.object({ topic_id: id, title: z.string().min(1) }),
    run: ({ topic_id, title }) => addContent(topic_id, form({ title })),
  }),
  tool({
    name: "leer_archivo",
    description:
      "Lee el contenido de un archivo de estudios (PDF de teoría, boletín de ejercicios, guía docente o foto) en Markdown, por páginas. " +
      "Si es largo devuelve un trozo: vuelve a llamar con desde_pagina para seguir. Los ids salen de la herramienta asignatura.",
    input: z.object({ file_id: id, desde_pagina: z.number().int().min(1).default(1) }),
    run: ({ file_id, desde_pagina }) => fileTextForClaude(file_id, desde_pagina),
  }),
  tool({
    name: "guardar_tipos_ejercicio",
    description:
      "Método de estudio, paso 1: guarda los tipos de ejercicio de un tema tras leer su boletín (los que se resuelven con el mismo método). " +
      "Si ya existe uno con el mismo nombre, lo actualiza. Devuelve los ids.",
    input: z.object({ topic_id: id, tipos: z.array(ExerciseTypeInput).min(1).max(20) }),
    run: ({ topic_id, tipos }) => saveExerciseTypes(topic_id, tipos),
  }),
  tool({
    name: "guardar_guia",
    description:
      "Método de estudio, paso 2: guarda la explicación de un tipo de ejercicio en Markdown (fórmulas en LaTeX con $…$): " +
      "un poco de teoría (## Teoría), los pasos para resolverlo (## Pasos) y un ejemplo resuelto (## Ejemplo resuelto). Sustituye la anterior.",
    input: z.object({ exercise_type_id: id, guia: z.string().min(1) }),
    run: ({ exercise_type_id, guia }) => saveGuide(exercise_type_id, guia),
  }),
  tool({
    name: "crear_practica",
    description:
      "Método de estudio, paso 3: crea una tanda de ejercicios de un tipo para hacerla en la app, con pista y solución que solo se ven al pulsar. " +
      "En test cada ejercicio lleva opciones y el índice (desde 0) de la correcta; en desarrollo, el resultado final si lo hay. " +
      "Si acierta el 80 % o más, el tipo queda dominado. Mira antes resultados_practica para centrarte en lo fallado.",
    input: z.object({
      exercise_type_id: id,
      modalidad: z.enum(keysOf(PRACTICE_MODES)),
      ejercicios: z.array(PracticeItemInput).min(1).max(15),
    }),
    run: async ({ exercise_type_id, modalidad, ejercicios }) => {
      const result = await createPractice(exercise_type_id, modalidad, ejercicios);
      if (!("id" in result)) return result;
      const { supabase } = await requireUser();
      await notify(supabase, {
        kind: "claude",
        title: `Claude te ha preparado una tanda de ${modalidad === "test" ? "test" : "desarrollo"}`,
        body: `${ejercicios.length} ejercicios, con pista y solución.`,
        url: `/estudios/practica/${result.id}`,
      });
      return { ...result, mensaje: "Tanda creada: aparece en la app, en el tipo de ejercicio, y le ha llegado un aviso." };
    },
  }),
  tool({
    name: "resultados_practica",
    description: "Tandas hechas de un tipo de ejercicio: aciertos, lo que falló (con lo que marcó en el test) y la guía guardada.",
    input: z.object({ exercise_type_id: id }),
    run: async ({ exercise_type_id }) => {
      const { supabase } = await requireUser();
      const loaded = await loadExerciseType(supabase, exercise_type_id);
      if (!loaded) return { error: "Tipo de ejercicio no encontrado" };
      const { type, topic } = loaded;
      return {
        tipo: type.name,
        tema: topic.title,
        asignatura: topic.subjectName,
        estado: type.status,
        guia: type.guide,
        tandas: await practiceHistory(supabase, exercise_type_id),
      };
    },
  }),
  tool({
    name: "ver_calendario",
    description:
      "Calendario global entre dos fechas (máx. 62 días): exámenes, tareas del plan, bloques de agenda, grabar/editar/publicar vídeos, entrenos y rutinas previstas, facturas que vencen y entregas. " +
      "Cada elemento trae type e id: las tareas (tarea) y los bloques (bloque) se pueden mover, borrar o marcar como hechos.",
    input: z.object({ desde: day, hasta: day }),
    run: async ({ desde, hasta }) => {
      if (hasta < desde) return { error: "«hasta» va antes que «desde»" };
      if (daysBetween(desde, hasta) > 62) return { error: "Pide como mucho 62 días" };
      const items = await getCalendarItems(desde, hasta);
      return items.map((item) => ({ ...item, href: undefined }));
    },
  }),
  tool({
    name: "crear_plan_estudio",
    description:
      "Plan de exámenes: guarda de golpe las tareas de estudio día a día (sin horas). Cada tarea: día, qué hacer en concreto, tipo " +
      "(estudiar, ejercicios, repasar, flashcards, simulacro u otro) y, si se puede, la asignatura, el tema y el tipo de ejercicio (ids de la herramienta asignatura). " +
      "Reparte 2–4 tareas por día, deja días de repaso y un simulacro antes de cada examen. Con reemplazar_desde, primero borra las pendientes desde ese día (de esas asignaturas).",
    input: z.object({ tareas: z.array(StudyTaskInput).min(1).max(300), reemplazar_desde: day.optional() }),
    run: async ({ tareas, reemplazar_desde }) => {
      const result = await createStudyTasks(tareas, reemplazar_desde);
      if ("error" in result && result.error) return result;
      const { supabase } = await requireUser();
      const days = new Set(tareas.map((t) => t.dia)).size;
      await notify(supabase, {
        kind: "claude",
        title: "Claude ha preparado tu plan de exámenes",
        body: `${tareas.length} tareas repartidas en ${days} días.`,
        url: "/estudios/plan",
      });
      return result;
    },
  }),
  tool({
    name: "ver_plan",
    description: "Plan de exámenes: tareas atrasadas, las de las próximas semanas (con id y si están hechas) y cómo va el plan de cada examen.",
    input: z.object({ semanas: z.number().int().min(0).max(26).default(4).describe("0 = todo el plan") }),
    run: async ({ semanas }) => {
      const plan = await getStudyPlan(semanas);
      const task = (t: (typeof plan.overdue)[number]) => ({
        id: t.id,
        dia: t.day,
        titulo: t.title,
        tipo: t.kind,
        asignatura: t.subjectName,
        hecha: t.done,
        notas: t.notes,
      });
      return {
        hoy: plan.today,
        examenes: plan.exams.map((e) => ({ asignatura: e.subjectName, fecha: e.exam_date, dias: e.days, plan_hechas: e.planDone, plan_total: e.planTotal })),
        atrasadas: plan.overdue.map(task),
        dias: plan.days.map((d) => ({ dia: d.day, tareas: d.tasks.map(task) })),
        mas_adelante: plan.later,
      };
    },
  }),
  tool({
    name: "replanificar",
    description: "Reparte las tareas atrasadas del plan entre los próximos días, antes del examen de cada asignatura, en los días con menos carga.",
    input: z.object({}),
    run: () => rescheduleStudyPlan(),
  }),
  tool({
    name: "borrar_plan",
    description: "Borra las tareas PENDIENTES del plan entre dos fechas (las hechas se quedan), opcionalmente solo de una asignatura.",
    input: z.object({ desde: day, hasta: day.optional(), asignatura_id: id.optional() }),
    run: ({ desde, hasta, asignatura_id }) => deleteStudyTasks(desde, hasta, asignatura_id),
  }),
  tool({
    name: "mover",
    description: "Mueve a otro día una tarea del plan (tipo tarea) o un bloque de la agenda (tipo bloque, también de hora). Los ids salen de ver_calendario o ver_plan.",
    input: z.object({ tipo: z.enum(["tarea", "bloque"]), id, dia: day, hora_inicio: time.optional(), hora_fin: time.optional() }),
    run: ({ tipo, id, dia, hora_inicio, hora_fin }) => (tipo === "tarea" ? moveStudyTask(id, dia) : moveAgendaItem(id, dia, hora_inicio, hora_fin)),
  }),
  tool({
    name: "borrar",
    description: "Borra una tarea del plan, un bloque de la agenda o un aviso programado.",
    input: z.object({ tipo: z.enum(["tarea", "bloque", "aviso"]), id }),
    run: ({ tipo, id }) => deleteRow(tipo === "tarea" ? "study_tasks" : tipo === "bloque" ? "agenda_items" : "notifications", id),
  }),
  tool({
    name: "marcar_hecho",
    description: "Marca (o desmarca) como hecha una tarea del plan, un bloque de la agenda o un hábito (los hábitos, en el día indicado o hoy).",
    input: z.object({ tipo: z.enum(["tarea", "bloque", "habito"]), id, hecho: z.boolean().default(true), dia: day.optional() }),
    run: ({ tipo, id, hecho, dia }) =>
      tipo === "tarea" ? toggleStudyTask(id, hecho) : tipo === "bloque" ? setFlag("agenda_items", id, hecho) : toggleHabit(id, dia ?? todayISO(), hecho),
  }),
  tool({
    name: "enviar_aviso",
    description:
      "Manda una notificación al móvil (y la deja en la campana de Hoy). Sin cuando, llega ya; con cuando (fecha y hora con zona, p. ej. 2026-12-01T18:00:00+01:00) " +
      "se programa y sale en la siguiente pasada de avisos (8:00 o 20:00, hora de Madrid). De 23:00 a 8:00 espera a la mañana si No molestar está activo.",
    input: z.object({
      titulo: z.string().min(1).max(120),
      texto: z.string().max(500).optional(),
      cuando: z.string().datetime({ offset: true }).optional(),
      enlace: z.string().startsWith("/").optional().describe("Ruta de la app que abre al tocarla, p. ej. /estudios/plan"),
    }),
    run: async ({ titulo, texto, cuando, enlace }) => {
      const { supabase } = await requireUser();
      await notify(supabase, { kind: "claude", title: titulo, body: texto, url: enlace, sendAt: cuando ? new Date(cuando).toISOString() : undefined });
      return { mensaje: cuando ? "Aviso programado." : "Aviso enviado." };
    },
  }),
  tool({
    name: "crear_examen",
    description: "Registra un examen de una asignatura.",
    input: z.object({ subject_id: id, exam_date: day, kind: z.enum(keysOf(EXAM_KINDS)), title: z.string().optional(), start_time: time.optional() }),
    run: (args) => saveExam(null, form(args)),
  }),
  tool({
    name: "proyectos_y_finanzas",
    description: "Proyectos freelance con horas y €/hora real, y el balance del mes (facturado, cobrado, por cobrar, gastos).",
    input: z.object({}),
    run: async () => {
      const [projects, finances] = await Promise.all([getProjectsOverview(), getFinances("mes")]);
      const summary = (p: (typeof projects.active)[number]) => ({ id: p.id, nombre: p.name, cliente: p.clientName, estado: p.status, horas: p.hours, ingresos: p.income, eur_hora: p.perHour, features: `${p.done}/${p.total}`, en_curso: p.doing });
      return {
        en_marcha: projects.active.map(summary),
        terminados: projects.delivered.map(summary),
        mes: { facturado: finances.billed, cobrado: finances.collected, por_cobrar: finances.outstanding, gastos: finances.spent, horas: finances.hours, eur_hora: finances.perHour },
        facturas_pendientes: finances.invoices.filter((i) => i.status !== "cobrada").map((i) => ({ numero: i.number, cliente: i.clientName, importe: i.amount, vence: i.due_date })),
      };
    },
  }),
  tool({
    name: "apuntar_horas",
    description: "Apunta horas trabajadas en un proyecto freelance.",
    input: z.object({ project_id: id, day, hours: z.number().positive().max(24), note: z.string().optional() }),
    run: (args) => logHours(form(args)),
  }),
  tool({
    name: "contenido",
    description: "Vídeos de TikTok en el pipeline (fase, fechas, guion) y las ventanas de publicación guardadas.",
    input: z.object({}),
    run: async () => {
      const [videos, calendar] = await Promise.all([getPipeline(), getContentCalendar()]);
      return {
        videos: videos.map((v) => ({ id: v.id, titulo: v.title, formato: v.format, fase: v.stage, grabar: v.record_date, editar: v.edit_date, publicar: v.publish_date, hora: v.publish_time, gancho: v.hook })),
        ventanas: calendar.windows.map((w) => ({ dia_semana: w.weekday, desde: w.start_time, hasta: w.end_time, nota: w.note })),
      };
    },
  }),
  tool({
    name: "guardar_ventanas_publicacion",
    description: "Guarda los mejores días y horas para publicar en TikTok (weekday: 0 = lunes … 6 = domingo). Sustituye las anteriores salvo reemplazar=false.",
    input: z.object({
      ventanas: z.array(z.object({ weekday: z.number().int().min(0).max(6), start_time: time, end_time: time, note: z.string().optional() })).min(1),
      reemplazar: z.boolean().default(true),
    }),
    run: ({ ventanas, reemplazar }) => replaceWindows(ventanas, reemplazar),
  }),
  tool({
    name: "crear_idea_video",
    description: "Guarda una idea de vídeo para TikTok (programación e IA) en el banco de ideas.",
    input: z.object({ title: z.string().min(1), hook: z.string().optional(), format: z.enum(keysOf(VIDEO_FORMATS)), hashtags: z.string().optional() }),
    run: (args) => saveContentIdea(null, form(args)),
  }),
  tool({
    name: "gym",
    description: "Rutina de hoy, semana de entrenos y récords personales.",
    input: z.object({}),
    run: async () => {
      const g = await getGymToday();
      return {
        hoy: g.routinesToday.map((r) => ({ rutina: r.name, ejercicios: r.items.map((i) => `${i.name} ${i.sets}×${i.reps}`) })),
        semana: g.week.map((d) => ({ dia: d.day, plan: d.planned, hecho: d.done })),
        records: g.records.map((r) => ({ ejercicio: r.exercise.name, peso: r.best.set.weight_kg, reps: r.best.set.reps, rm_estimado: Math.round(r.best.max) })),
      };
    },
  }),
  tool({
    name: "objetivos",
    description: "Objetivos del trimestre con su progreso actual.",
    input: z.object({}),
    run: async () => (await getGoals()).goals.map((g) => ({ objetivo: g.title, valor: g.value, meta: g.target, unidad: g.unit, progreso_pct: g.pct, fin: g.end_date })),
  }),
  tool({
    name: "datos_semana",
    description: "Números de la semana (estudio, entrenos, vídeos, horas freelance, hábitos) y la revisión guardada si existe.",
    input: z.object({}),
    run: () => getWeekReview(),
  }),
  tool({
    name: "capturar",
    description: "Apunta algo en la bandeja de entrada para clasificarlo después.",
    input: z.object({ content: z.string().min(1), kind: z.enum(keysOf(INBOX_KINDS)).default("nota") }),
    run: (args) => createInboxItem(form(args)),
  }),
];
