import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/env";

/** Cliente de navegador: solo para subir archivos a Storage desde el móvil. */
export const createClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
