import { FILES_BUCKET } from "./env";
import { createClient } from "./supabase/client";

export type UploadConfig = {
  userId: string;
  /** Subcarpeta dentro de la del usuario, p. ej. "subjects/{id}". */
  folder: string;
  accept?: string;
  required?: boolean;
  label?: string;
};

const safeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(-80);

/**
 * Sube el campo "file" del formulario directamente a Storage desde el navegador
 * y lo sustituye por sus metadatos (file_path, file_name…), que lee lib/form.ts.
 */
export async function attachUpload(fd: FormData, { userId, folder, required }: UploadConfig) {
  const file = fd.get("file");
  fd.delete("file");
  if (!(file instanceof File) || file.size === 0) {
    if (required) throw new Error("Elige un archivo");
    return;
  }
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await createClient()
    .storage.from(FILES_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  fd.set("file_path", path);
  fd.set("file_name", file.name);
  fd.set("file_size", String(file.size));
  fd.set("file_mime", file.type);
}
