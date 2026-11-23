import "server-only";
import { z } from "zod";
import { AGENDA_CATEGORIES, EXAM_KINDS, INBOX_KINDS, PRACTICE_MODES, VIDEO_FORMATS, keysOf } from "@/lib/constants";
import { requireUser } from "@/lib/supabase/server";
import { createAgendaItem, createInboxItem } from "@/features/hoy/actions";
import { getToday } from "@/features/hoy/queries";
import { addContent, createPractice, saveExam, saveExerciseTypes, saveGuide, setMastery } from "@/features/estudios/actions";
import { fileTextForClaude } from "@/features/estudios/file-text";
import { ExerciseTypeInput, PracticeItemInput, loadExerciseType, practiceHistory } from "@/features/estudios/practice";
import { startAdvice } from "@/features/estudios/logic";
import { getExamsView, getSubjectDetail, getSubjectsOverview } from "@/features/estudios/queries";
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
      return "id" in result ? { ...result, mensaje: "Tanda creada: aparece en la app, en el tipo de ejercicio." } : result;
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
