import "server-only";
import { AI_FEATURES, NOTIFICATIONS, keysOf, type AiFeature, type NotificationKind } from "@/lib/constants";
import { requireUser } from "@/lib/supabase/server";

const allOn = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>;
const DEFAULTS = { ai: allOn(keysOf(AI_FEATURES)), notifications: { ...allOn(keysOf(NOTIFICATIONS)), gym: false } };

/** Preferencias del usuario, con valores por defecto si aún no hay fila. */
export async function getSettings(): Promise<{ ai: Record<AiFeature, boolean>; notifications: Record<NotificationKind, boolean> }> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("settings").select("ai, notifications").maybeSingle();
  return {
    ai: { ...DEFAULTS.ai, ...(data?.ai ?? {}) },
    notifications: { ...DEFAULTS.notifications, ...(data?.notifications ?? {}) },
  };
}
