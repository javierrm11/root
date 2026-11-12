import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Db } from "./server";

/**
 * "Contexto propietario": el servidor MCP (Claude) y el cron de notificaciones no traen
 * cookies de sesión. Inician sesión como el dueño de la app (ROOT_EMAIL / ROOT_PASSWORD)
 * y ejecutan dentro de este contexto, así requireUser() y todas las consultas y
 * acciones existentes funcionan igual, con RLS incluido.
 */
type OwnerCtx = { supabase: Db; userId: string };

// Guarda cómo obtener la sesión, no la sesión: solo se inicia sesión si algo la necesita
// (así el MCP puede presentarse y listar herramientas aunque falten credenciales).
const store = new AsyncLocalStorage<() => Promise<OwnerCtx>>();
let cached: { ctx: OwnerCtx; expiresAt: number } | null = null;

export const ownerContext = () => store.getStore();

async function signInOwner(): Promise<OwnerCtx> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.ctx;
  const email = process.env.ROOT_EMAIL;
  const password = process.env.ROOT_PASSWORD;
  if (!email || !password) throw new Error("Faltan ROOT_EMAIL y ROOT_PASSWORD en .env");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`No se pudo iniciar sesión como propietario: ${error?.message ?? "sin sesión"}`);

  const ctx = { supabase: supabase as unknown as Db, userId: data.user.id };
  cached = { ctx, expiresAt: (data.session.expires_at ?? 0) * 1000 };
  return ctx;
}

export function runAsOwner<T>(fn: () => Promise<T>): Promise<T> {
  return store.run(signInOwner, fn);
}

/** Compara secretos sin filtrar información por el tiempo de respuesta. */
export function sameSecret(given: string | null | undefined, expected: string | undefined) {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
