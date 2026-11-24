import "server-only";
import { groupBy } from "@/lib/collections";
import { AGENDA_CATEGORIES, CALENDAR_AREAS, EXAM_KINDS, STUDY_TASK_KINDS, VIDEO_TASKS, keysOf, type AgendaCategory, type CalendarArea } from "@/lib/constants";
import { addDays, addMonths, formatTime, monthStart, todayISO, weekdayMonday } from "@/lib/dates";
import { requireUser, must } from "@/lib/supabase/server";
import type { AgendaItem, Exam, Invoice, Project, Routine, StudyTask, Video, Workout } from "@/lib/types";

// Calendario global: junta en un solo formato todo lo que pasa cada día en la app.
// Lo usan la pantalla Calendario, la semana de Hoy y la herramienta ver_calendario del MCP.

export type CalendarItem = {
  /** Tipo y id de la fila, para que Claude pueda moverla o marcarla (tarea y bloque). */
  type: "examen" | "tarea" | "bloque" | "video" | "entreno" | "rutina" | "factura" | "entrega";
  id: string;
  day: string;
  area: CalendarArea;
  title: string;
  subtitle: string;
  href: string;
  done?: boolean;
  /** Algo con fecha límite (examen, entrega, factura): se marca más fuerte en el calendario. */
  important?: boolean;
};

const AGENDA_AREA: Record<AgendaCategory, CalendarArea> = {
  estudio: "estudios",
  contenido: "contenido",
  gym: "gym",
  freelance: "proyectos",
  personal: "personal",
};

/** Todo lo que hay entre dos fechas (incluidas), ordenado por día. */
export async function getCalendarItems(from: string, to: string): Promise<CalendarItem[]> {
  const { supabase } = await requireUser();
  const today = todayISO();
  const range = <T,>(table: string, column: string) =>
    supabase.from(table).select("*").gte(column, from).lte(column, to).then((res) => must(res as { data: T[] | null; error: { message: string } | null }));

  const [exams, tasks, agenda, videos, workouts, routines, invoices, projects, subjects] = await Promise.all([
    range<Exam>("exams", "exam_date"),
    range<StudyTask>("study_tasks", "day"),
    range<AgendaItem>("agenda_items", "day"),
    supabase
      .from("videos")
      .select("*")
      .or(VIDEO_TASKS.map((t) => `and(${t.key}.gte.${from},${t.key}.lte.${to})`).join(","))
      .then(must<Video[]>),
    range<Workout>("workouts", "day"),
    supabase.from("routines").select("*").then(must<Routine[]>),
    supabase.from("invoices").select("*").neq("status", "cobrada").gte("due_date", from).lte("due_date", to).then(must<Invoice[]>),
    range<Project>("projects", "end_date"),
    supabase.from("subjects").select("id, name").then(must<Array<{ id: string; name: string }>>),
  ]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const items: CalendarItem[] = [];

  for (const e of exams) {
    const name = subjectName.get(e.subject_id) ?? "";
    items.push({
      type: "examen", id: e.id, day: e.exam_date, area: "estudios", important: true,
      title: `Examen ${EXAM_KINDS[e.kind].label.toLowerCase()} de ${name}`,
      subtitle: [e.title, formatTime(e.start_time)].filter(Boolean).join(" · ") || "Examen",
      href: `/estudios/asignatura/${e.subject_id}`,
    });
  }
  for (const t of tasks) {
    items.push({
      type: "tarea", id: t.id, day: t.day, area: "estudios", done: t.done, title: t.title,
      subtitle: [STUDY_TASK_KINDS[t.kind].label, t.subject_id && subjectName.get(t.subject_id)].filter(Boolean).join(" · "),
      href: t.exercise_type_id ? `/estudios/ejercicio/${t.exercise_type_id}` : t.subject_id ? `/estudios/asignatura/${t.subject_id}` : "/estudios/plan",
    });
  }
  for (const a of agenda) {
    items.push({
      type: "bloque", id: a.id, day: a.day, area: AGENDA_AREA[a.category], done: a.done, title: a.title,
      subtitle: [AGENDA_CATEGORIES[a.category].label, a.start_time && `${formatTime(a.start_time)}${a.end_time ? `–${formatTime(a.end_time)}` : ""}`].filter(Boolean).join(" · "),
      href: "/",
    });
  }
  for (const v of videos) {
    for (const task of VIDEO_TASKS) {
      const day = v[task.key];
      if (!day || day < from || day > to) continue;
      items.push({
        type: "video", id: v.id, day, area: "contenido", important: task.key === "publish_date",
        title: `${task.label} «${v.title}»`,
        subtitle: task.key === "publish_date" && v.publish_time ? `A las ${formatTime(v.publish_time)}` : "Contenido",
        href: `/contenido/video/${v.id}`,
      });
    }
  }
  const trained = new Set(workouts.map((w) => w.day));
  for (const w of workouts) {
    items.push({
      type: "entreno", id: w.id, day: w.day, area: "gym", done: Boolean(w.finished_at),
      title: routines.find((r) => r.id === w.routine_id)?.name ?? "Entreno",
      subtitle: w.finished_at ? "Entreno hecho" : "Entreno en curso",
      href: `/gym/entreno/${w.id}`,
    });
  }
  // Rutinas previstas (por día de la semana) desde hoy, si ese día aún no hay entreno.
  for (let day = from < today ? today : from; day <= to; day = addDays(day, 1)) {
    if (trained.has(day)) continue;
    for (const r of routines.filter((r) => r.weekdays.includes(weekdayMonday(day)))) {
      items.push({ type: "rutina", id: r.id, day, area: "gym", title: `Toca ${r.name}`, subtitle: "Rutina prevista", href: "/gym" });
    }
  }
  for (const i of invoices) {
    items.push({
      type: "factura", id: i.id, day: i.due_date!, area: "proyectos", important: true,
      title: `Vence la factura ${i.number ?? ""}`.trim(), subtitle: `${Number(i.amount).toLocaleString("es-ES")} €`,
      href: "/proyectos/finanzas",
    });
  }
  for (const p of projects) {
    if (p.status === "entregado") continue;
    items.push({ type: "entrega", id: p.id, day: p.end_date!, area: "proyectos", important: true, title: `Entrega: ${p.name}`, subtitle: "Fecha de fin del proyecto", href: `/proyectos/proyecto/${p.id}` });
  }
  return items.sort((a, b) => a.day.localeCompare(b.day));
}

/** Los elementos agrupados por día (para marcar el calendario). */
export const byDay = (items: CalendarItem[]) => groupBy(items, (i) => i.day);

/** Pantalla Calendario: el mes con sus marcas, el día elegido y los filtros por área. */
export async function getCalendarMonth(month?: string, day?: string, area?: string) {
  await requireUser(); // antes de leer la fecha (io())
  const today = todayISO();
  const start = monthStart(month && /^\d{4}-\d{2}$/.test(month) ? month : (day ?? today).slice(0, 7));
  const end = addDays(addMonths(start, 1), -1);
  const selected = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : today.startsWith(start.slice(0, 7)) ? today : start;
  const all = await getCalendarItems(start < selected ? start : selected, end > selected ? end : selected);
  const filter = area && area in CALENDAR_AREAS ? (area as CalendarArea) : null;
  const items = filter ? all.filter((i) => i.area === filter) : all;
  return {
    today,
    month: start,
    selected,
    area: filter,
    items: items.filter((i) => i.day >= start && i.day <= end),
    dayItems: items.filter((i) => i.day === selected),
    counts: Object.fromEntries(keysOf(CALENDAR_AREAS).map((a) => [a, all.filter((i) => i.area === a && i.day >= start && i.day <= end).length])) as Record<CalendarArea, number>,
  };
}
