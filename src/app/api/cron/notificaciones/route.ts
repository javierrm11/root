import { formatTime, todayISO, weekdayMonday } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { pushConfigured, sendPush } from "@/lib/push";
import { runAsOwner, sameSecret } from "@/lib/supabase/owner";
import { requireUser } from "@/lib/supabase/server";
import { getSettings } from "@/features/ajustes/queries";
import { getContentToday } from "@/features/contenido/queries";
import { getGymToday } from "@/features/gym/queries";

/**
 * Resumen diario por notificación push. Lo llama Vercel Cron cada mañana (vercel.json)
 * con la cabecera Authorization: Bearer CRON_SECRET. También marca como vencidas
 * las facturas que han pasado de fecha.
 */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!sameSecret(token, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  if (!pushConfigured()) return Response.json({ sent: 0, reason: "Faltan las claves VAPID" });

  return runAsOwner(async () => {
    const { supabase } = await requireUser();
    const today = todayISO();
    const { notifications: on } = await getSettings();
    const lines: string[] = [];

    // Facturas que han vencido: se marcan y se avisan.
    const { data: overdue } = await supabase
      .from("invoices")
      .update({ status: "vencida" })
      .eq("status", "emitida")
      .lt("due_date", today)
      .select("number, amount");
    if (on.facturas && overdue?.length) {
      lines.push(`Facturas vencidas: ${overdue.map((i) => `${i.number ?? "sin número"} (${formatMoney(Number(i.amount))})`).join(", ")}`);
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

    if (on.domingo && weekdayMonday(today) === 6) lines.push("Hoy toca la revisión semanal.");

    if (!lines.length) return Response.json({ sent: 0, lines });
    const sent = await sendPush(supabase, { title: "Hoy en root", body: lines.join("\n"), url: weekdayMonday(today) === 6 ? "/revision" : "/" });
    return Response.json({ sent, lines });
  });
}
