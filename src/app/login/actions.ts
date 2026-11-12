"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form";

export async function signIn(_prev: { error?: string } | undefined, fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: text(fd, "email"), password: text(fd, "password") });
  if (error) return { error: "Email o contraseña incorrectos" };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
