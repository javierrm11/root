import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { FILES_BUCKET } from "./env";
import type { Db } from "./supabase/server";

// Gemini dentro de la app. El modelo por defecto es el alias que sigue al Flash más reciente.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MAX_INLINE_BYTES = 18 * 1024 * 1024; // límite práctico de archivos en línea

export const aiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

let client: GoogleGenAI | null = null;
function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY en .env");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

export type AiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Texto libre (Markdown sencillo). */
export async function generateText(system: string, parts: AiPart[]) {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: system },
  });
  return response.text?.trim() ?? "";
}

/** Respuesta estructurada validada con zod. */
export async function generateJson<T>(system: string, parts: AiPart[], schema: z.ZodType<T>) {
  const response = await gemini().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(schema) },
  });
  return schema.parse(JSON.parse(response.text ?? "{}"));
}

/** Descarga PDFs o imágenes de Storage como partes para Gemini (ignora el resto). */
export async function fileParts(supabase: Db, files: Array<{ storage_path: string; mime_type: string | null }>) {
  const usable = files.filter((f) => f.mime_type === "application/pdf" || f.mime_type?.startsWith("image/"));
  const parts: AiPart[] = [];
  let total = 0;
  for (const file of usable) {
    const { data } = await supabase.storage.from(FILES_BUCKET).download(file.storage_path);
    if (!data || total + data.size > MAX_INLINE_BYTES) continue;
    total += data.size;
    parts.push({ inlineData: { mimeType: file.mime_type!, data: Buffer.from(await data.arrayBuffer()).toString("base64") } });
  }
  return parts;
}

/** Instrucción común: español, para un estudiante de Ingeniería Informática. */
export const SYSTEM_BASE =
  "Eres el asistente de «root», la app personal de un estudiante de 1º de Ingeniería Informática en España que además hace trabajos freelance de desarrollo web, crea contenido de programación e IA en TikTok y va al gimnasio. Responde siempre en español de España, claro y directo, sin relleno.";
