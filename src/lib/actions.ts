import "server-only";
import { refresh } from "next/cache";
import { requireUser, type UserCtx } from "./supabase/server";

/** Resultado que devuelven todas las Server Actions a los formularios. */
export type ActionResult = { error?: string } | void;

type DbResult = { error: { message: string } | null };

/** Error de validación con el mismo formato que los de Supabase. */
export const invalid = (message: string): DbResult => ({ error: { message } });

/**
 * Envoltorio común de las Server Actions: autentica, ejecuta y refresca la ruta.
 * Si `fn` devuelve un error, se manda al formulario en vez de lanzar.
 */
export async function mutate(
  fn: (ctx: UserCtx) => PromiseLike<DbResult | void> | DbResult | void,
  { refreshRoute = true }: { refreshRoute?: boolean } = {},
): Promise<ActionResult> {
  const ctx = await requireUser();
  const result = await fn(ctx);
  if (result?.error) return { error: result.error.message };
  if (refreshRoute) refresh();
}
