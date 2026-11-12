import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import type { Db } from "./supabase/server";

export const PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
export const pushConfigured = () => Boolean(PUSH_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function configure() {
  if (ready) return;
  if (!pushConfigured()) throw new Error("Faltan las claves VAPID en .env");
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:root@localhost", PUSH_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

export type PushPayload = { title: string; body: string; url?: string };

/** Envía una notificación a todos los dispositivos suscritos; borra los que ya no existen. */
export async function sendPush(supabase: Db, payload: PushPayload) {
  configure();
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  return sent;
}
