import { addDays, daysBetween, formatTime, todayISO, weekdayMonday } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { deliverDue, queueNotifications, type NewNotification } from "@/lib/notify";
import { runAsOwner, sameSecret } from "@/lib/supabase/owner";
import { requireUser } from "@/lib/supabase/server";
import { getSettings } from "@/features/ajustes/queries";
import { getContentToday } from "@/features/contenido/queries";
import { getGymToday } from "@/features/gym/queries";
import { getToday } from "@/features/hoy/queries";

/** Días antes de un examen en los que se avisa de la cuenta atrás. */
const EXAM_MILESTONES = [30, 14, 7, 3, 1];

/**
 * Avisos automáticos. Vercel Cron llama dos veces al día (vercel.json) con
 * Authorization: Bearer CRON_SECRET:
 * - por la mañana (?momento=manana): resumen del día, plan, cuenta atrás de exámenes y facturas vencidas;
 * - por la tarde (?momento=tarde): racha en peligro, lo que queda del plan y lo de mañana.
 * En las dos pasadas salen también los recordatorios programados (p. ej. los de Claude).
 */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!sameSecret(token, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  const evening = new URL(request.url).searchParams.get("momento") === "tarde";

  return runAsOwner(async () => {
    const { supabase } = await requireUser();
    const today = todayISO();
    const { notifications: on } = await getSettings();
    const list = evening ? await eveningNotifications(today, on) : await morningNotifications(today, on);
    await queueNotifications(supabase, list);
    const sent = await deliverDue(supabase, { force: !evening });
    return Response.json({ momento: evening ? "tarde" : "manana", avisos: list.length, enviados: sent });
  });
}

type On = Awaited<ReturnType<typeof getSettings>>["notifications"];

async function morningNotifications(today: string, on: On): Promise<NewNotification[]> {
  const { supabase } = await requireUser();
  const list: NewNotification[] = [];
  const lines: string[] = [];

  // Facturas que han vencido: se marcan y se avisan.
  const { data: overdue } = await supabase
    .from("invoices")
    .update({ status: "vencida" })
    .eq("status", "emitida")
    .lt("due_date", today)
    .select("number, amount");
  if (on.facturas && overdue?.length) {
    list.push({
      kind: "facturas",
      title: overdue.length === 1 ? "Una factura ha vencido" : `${overdue.length} facturas han vencido`,
      body: overdue.map((i) => `${i.number ?? "Sin número"} · ${formatMoney(Number(i.amount))}`).join("\n"),
      url: "/proyectos/finanzas",
    });
  }

  if (on.plan) {
    const { data: tasks } = await supabase.from("study_tasks").select("title").eq("day", today).eq("done", false).order("position");
    if (tasks?.length) lines.push(`Plan: ${tasks.slice(0, 3).map((t) => t.title).join(" · ")}${tasks.length > 3 ? ` (+${tasks.length - 3})` : ""}`);
  }
  if (on.estudio) {
    const { data: blocks } = await supabase.from("agenda_items").select("title, start_time").eq("day", today).eq("category", "estudio").order("start_time");
    if (blocks?.length) lines.push(`Estudio: ${blocks.map((b) => `${formatTime(b.start_time)} ${b.title}`.trim()).join(" · ")}`);
  }
  if (on.contenido) {
    const content = await getContentToday();
    if (content.today.length) lines.push(`Contenido: ${content.today.map((t) => `${t.task.label.toLowerCase()} «${t.video.title}»`).join(" · ")}`);
  }
  if (on.gym) {
    const gym = await getGymToday();
    if (gym.routinesToday.length) lines.push(`Gym: toca ${gym.routinesToday.map((r) => r.name).join(" y ")}`);
  }
  if (lines.length) list.push({ kind: "resumen", title: "Buenos días · hoy en root", body: lines.join("\n"), url: "/" });

  if (on.examenes) {
    const { data: exams } = await supabase.from("exams").select("exam_date, subjects(name)").gte("exam_date", today).order("exam_date");
    for (const exam of exams ?? []) {
      const days = daysBetween(today, exam.exam_date);
      if (!EXAM_MILESTONES.includes(days)) continue;
      const name = (exam.subjects as unknown as { name: string } | null)?.name ?? "el examen";
      list.push({
        kind: "examenes",
        title: days === 1 ? `Mañana es el examen de ${name}` : `Quedan ${days} días para ${name}`,
        body: days <= 3 ? "Toca repasar y hacer un simulacro. ¡Tú puedes!" : "Mira cómo vas en el plan de exámenes.",
        url: "/estudios/plan",
      });
    }
  }

  if (on.domingo && weekdayMonday(today) === 6) {
    list.push({ kind: "domingo", title: "Hoy toca la revisión semanal", body: "Mira cómo ha ido la semana y prepara la siguiente.", url: "/revision" });
  }
  return list;
}

async function eveningNotifications(today: string, on: On): Promise<NewNotification[]> {
  const { supabase } = await requireUser();
  const list: NewNotification[] = [];
  const tomorrow = addDays(today, 1);
  const [hoy, { data: planToday }, { data: planTomorrow }, { data: examsTomorrow }, content] = await Promise.all([
    getToday(),
    supabase.from("study_tasks").select("done").eq("day", today),
    supabase.from("study_tasks").select("title").eq("day", tomorrow).eq("done", false).order("position"),
    supabase.from("exams").select("subjects(name)").eq("exam_date", tomorrow),
    getContentToday(),
  ]);
  const planDone = (planToday ?? []).filter((t) => t.done).length;
  const planLeft = (planToday ?? []).length - planDone;
  const habitsDone = hoy.habits.filter((h) => h.done).length;

  if (on.racha && hoy.streak > 0 && habitsDone === 0 && planDone === 0) {
    list.push({
      kind: "racha",
      title: `Tu racha de ${hoy.streak} ${hoy.streak === 1 ? "día" : "días"} está en peligro`,
      body: "Marca un hábito o una tarea del plan antes de dormir para no perderla.",
      url: "/",
    });
  } else if (on.plan && planLeft > 0) {
    list.push({
      kind: "plan",
      title: planLeft === 1 ? "Te queda 1 tarea del plan de hoy" : `Te quedan ${planLeft} tareas del plan de hoy`,
      body: "Si no te da tiempo, en Plan puedes reorganizar lo atrasado.",
      url: "/estudios/plan",
    });
  }

  if (on.manana) {
    const lines = [
      ...(examsTomorrow ?? []).map((e) => `Examen de ${(e.subjects as unknown as { name: string } | null)?.name ?? ""}`),
      ...(planTomorrow ?? []).slice(0, 3).map((t) => t.title),
      ...content.tomorrow.map((t) => `${t.task.label} «${t.video.title}»`),
    ];
    if (lines.length) list.push({ kind: "manana", title: "Mañana en root", body: lines.join("\n"), url: `/calendario?dia=${tomorrow}` });
  }
  return list;
}
