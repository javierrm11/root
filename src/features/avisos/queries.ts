import "server-only";
import { requireUser, must } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";

/** Avisos que ya han llegado (los programados aparecen cuando les toca), los más nuevos arriba. */
export async function getNotifications() {
  const { supabase } = await requireUser();
  const now = new Date().toISOString();
  const [items, scheduled] = await Promise.all([
    supabase.from("notifications").select("*").lte("send_at", now).order("send_at", { ascending: false }).limit(80).then(must<AppNotification[]>),
    supabase.from("notifications").select("*").gt("send_at", now).order("send_at").limit(20).then(must<AppNotification[]>),
  ]);
  return { items, scheduled, unread: items.filter((n) => !n.read_at).length };
}

/** Número de avisos sin leer (la campana de Hoy). */
export async function getUnreadCount() {
  const { supabase } = await requireUser();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .lte("send_at", new Date().toISOString());
  return count ?? 0;
}
