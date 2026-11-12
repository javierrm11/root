// Variables públicas: Next las incrusta en el bundle, deben leerse literalmente.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Bucket privado de Storage (ver supabase/migrations). */
export const FILES_BUCKET = "files";

/** Zona horaria de la app: decide qué es "hoy" aunque el servidor esté en UTC. */
export const APP_TIMEZONE = "Europe/Madrid";
