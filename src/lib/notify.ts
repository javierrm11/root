import "server-only";
import { getSettings } from "@/features/ajustes/queries";
import type { NotificationKind } from "./constants";
import { nowTime } from "./dates";
import { pushConfigured, sendPush } from "./push";
import type { Db } from "./supabase/server";

// Avisos de la app: cada uno se guarda en `notifications` (la campana de Hoy los lista)
// y se manda por push cuando toca. Los programados (send_at futuro) salen en la siguiente
// pasada del cron (mañana y tarde, vercel.json) o al crear otro aviso.

export type NewNotification = {
  kind: NotificationKind | "resumen";
  title: string;
  body?: string;
  url?: string;
  /** ISO con hora. Sin él, llega ya (salvo "no molestar"). */
  sendAt?: string;
};

/** De 23:00 a 8:00 (hora de Madrid) no se manda nada si "No molestar de noche" está activo. */
const isNight = () => {
  const hour = Number(nowTime().slice(0, 2));
  return hour >= 23 || hour < 8;
};

/** Guarda avisos sin mandarlos todavía (el cron los manda todos juntos con `deliverDue`). */
export async function queueNotifications(supabase: Db, list: NewNotification[]) {
  if (!list.length) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from("notifications").insert(
    list.map((n) => ({ kind: n.kind, title: n.title, body: n.body ?? null, url: n.url ?? null, send_at: n.sendAt ?? now })),
  );
  if (error) throw new Error(error.message);
}

/** Guarda un aviso y, si ya toca, lo manda. */
export async function notify(supabase: Db, n: NewNotification) {
  await queueNotifications(supabase, [n]);
  await deliverDue(supabase);
}

/**
 * Manda por push los avisos pendientes cuya hora ya ha llegado y los marca como enviados.
 * Los de un tipo desactivado en Ajustes se marcan sin mandar (siguen en la campana).
 * `force` salta el "no molestar" (lo usa el cron de la mañana).
 */
export async function deliverDue(supabase: Db, { force = false } = {}) {
  const { notifications: on } = await getSettings();
  if (!force && on.silencio && isNight()) return 0;
  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("notifications")
    .select("id, kind, title, body, url")
    .is("sent_at", null)
    .lte("send_at", now)
    .order("send_at");
  if (!due?.length) return 0;

  let sent = 0;
  if (pushConfigured()) {
    for (const n of due) {
      const enabled = on[n.kind as NotificationKind] ?? true;
      if (enabled) sent += await sendPush(supabase, { title: n.title, body: n.body ?? "", url: n.url ?? "/avisos" });
    }
  }
  await supabase.from("notifications").update({ sent_at: now }).in("id", due.map((n) => n.id));
  return sent;
}
