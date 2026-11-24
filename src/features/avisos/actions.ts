"use server";

import { mutate } from "@/lib/actions";

export async function markAllRead() {
  return mutate(({ supabase }) =>
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).lte("send_at", new Date().toISOString()),
  );
}

export async function markRead(id: string) {
  return mutate(({ supabase }) => supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id));
}
