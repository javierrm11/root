import "server-only";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { ownerContext } from "./supabase/owner";
import { requireUser, type Db, type UserCtx } from "./supabase/server";

/** Inserta (id = null) o actualiza una fila: el patrón de todos los formularios "crear / editar". */
export const upsert = (supabase: Db, table: string, id: string | null, fields: object) =>
  id ? supabase.from(table).update(fields).eq("id", id) : supabase.from(table).insert(fields);

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
  let result: DbResult | void;
  try {
    result = await fn(ctx);
  } catch (error) {
    unstable_rethrow(error); // deja pasar redirect() y notFound()
    return { error: error instanceof Error ? error.message : "Algo ha fallado" };
  }
  if (result?.error) return { error: result.error.message };
  // Desde el MCP o el cron no hay ruta que refrescar.
  if (refreshRoute && !ownerContext()) refresh();
}
