"use server";

import { invalid, mutate } from "@/lib/actions";
import { sendPush } from "@/lib/push";
import { getSettings } from "./queries";

/** Activa o desactiva una opción de IA o de notificaciones. */
export async function setSetting(field: "ai" | "notifications", key: string, value: boolean) {
  const current = await getSettings();
  return mutate(({ supabase, userId }) =>
    supabase.from("settings").upsert({ user_id: userId, [field]: { ...current[field], [key]: value } }, { onConflict: "user_id" }),
  );
}

type BrowserSubscription = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Guarda la suscripción push de este dispositivo. */
export async function savePushSubscription(subscription: BrowserSubscription, userAgent: string) {
  return mutate(({ supabase }) => {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys?.p256dh || !keys.auth) return invalid("Suscripción no válida");
    return supabase
      .from("push_subscriptions")
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent.slice(0, 200) }, { onConflict: "endpoint" });
  });
}

export async function removePushSubscription(endpoint: string) {
  return mutate(({ supabase }) => supabase.from("push_subscriptions").delete().eq("endpoint", endpoint));
}

export async function sendTestPush() {
  return mutate(async ({ supabase }) => {
    const sent = await sendPush(supabase, { title: "root", body: "Las notificaciones funcionan en este dispositivo.", url: "/ajustes" });
    if (!sent) return invalid("No hay ningún dispositivo suscrito");
  }, { refreshRoute: false });
}
