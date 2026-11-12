// Lectura tipada de FormData para las Server Actions.

export function text(fd: FormData, key: string) {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export const optText = (fd: FormData, key: string) => text(fd, key) || null;

export function optInt(fd: FormData, key: string) {
  const raw = text(fd, key);
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function optNumber(fd: FormData, key: string) {
  const raw = text(fd, key);
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function oneOf<K extends string>(fd: FormData, key: string, allowed: readonly K[], fallback: K): K {
  const value = text(fd, key) as K;
  return allowed.includes(value) ? value : fallback;
}

export type UploadedFile = { path: string; name: string; size: number; mime: string | null };

/**
 * Metadatos de un archivo que el cliente ya subió a Storage (ver lib/upload.ts).
 * Comprueba que la ruta esté dentro de la carpeta del usuario.
 */
export function uploadedFile(fd: FormData, userId: string): UploadedFile | null {
  const path = text(fd, "file_path");
  if (!path || !path.startsWith(`${userId}/`)) return null;
  return {
    path,
    name: text(fd, "file_name") || path.split("/").pop()!,
    size: Number(text(fd, "file_size")) || 0,
    mime: optText(fd, "file_mime"),
  };
}
