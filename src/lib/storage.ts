import "server-only";
import { FILES_BUCKET } from "./env";
import type { Db } from "./supabase/server";

const SIGNED_URL_TTL = 60 * 60; // 1 hora

/** Firma varias rutas de Storage a la vez. Devuelve ruta → URL temporal. */
export async function signPaths(supabase: Db, paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  if (!unique.length) return urls;
  const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL);
  data?.forEach((item) => item.path && item.signedUrl && urls.set(item.path, item.signedUrl));
  return urls;
}

export async function removePaths(supabase: Db, paths: Array<string | null | undefined>) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length) await supabase.storage.from(FILES_BUCKET).remove(list);
}

/** Borra de Storage el archivo al que apunta una columna de una fila (al reemplazarlo o borrar la fila). */
export async function removeRowFile(supabase: Db, table: string, id: string, column: string) {
  const { data } = await supabase.from(table).select(column).eq("id", id).maybeSingle();
  const path = (data as Record<string, string | null> | null)?.[column];
  await removePaths(supabase, [path]);
}
