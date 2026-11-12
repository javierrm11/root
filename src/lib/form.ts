// Lectura tipada de FormData para las Server Actions.
import { COVER_PATTERNS, SUBJECT_TONES, keysOf } from "./constants";

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

/** Lista separada por comas: "Next.js, Stripe" → ["Next.js", "Stripe"]. */
export const list = (fd: FormData, key: string) =>
  text(fd, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Campos de portada (tono, patrón y símbolo) de CoverFields. */
export function coverFields(fd: FormData) {
  return {
    tone: oneOf(fd, "tone", keysOf(SUBJECT_TONES), "study"),
    pattern: oneOf(fd, "pattern", keysOf(COVER_PATTERNS), "dots"),
    glyph: optText(fd, "glyph")?.slice(0, 4) ?? null,
  };
}

export type UploadedFile ={ path: string; name: string; size: number; mime: string | null };

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
