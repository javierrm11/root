import "server-only";
import { notFound } from "next/navigation";
import { extractText, getDocumentProxy } from "unpdf";
import { SYSTEM_BASE, aiConfigured, generateText } from "@/lib/ai";
import { FILES_BUCKET } from "@/lib/env";
import { requireUser, type Db } from "@/lib/supabase/server";
import type { StudyFile } from "@/lib/types";
import { isReadable } from "./logic";

// Texto de los archivos de estudio para que Claude los lea por MCP (study_files.content_md).
// 1) PDF con texto: se extrae con unpdf (rápido y gratis).
// 2) PDF escaneado, con poco texto (casi todo fórmulas o dibujos) o imagen: lo transcribe Gemini.

const pageMark = (n: number) => `--- Página ${n} ---`;
const PAGE_SPLIT = /^--- Página (\d+) ---$/m;
/** Por debajo de esto por página, el PDF es un escaneado o casi todo fórmulas: mejor Gemini. */
const MIN_CHARS_PER_PAGE = 250;
/** Lo que se devuelve a Claude en cada llamada (≈ 12 000 tokens). */
const SLICE_CHARS = 45_000;
const MAX_GEMINI_BYTES = 18 * 1024 * 1024;

type FileRef = Pick<StudyFile, "id" | "storage_path" | "mime_type">;

async function pdfPages(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((page) => page.replace(/[ \t]+\n/g, "\n").trim());
}

async function transcribe(bytes: Uint8Array, mimeType: string) {
  if (!aiConfigured() || bytes.byteLength > MAX_GEMINI_BYTES) return "";
  return generateText(
    `${SYSTEM_BASE} Transcribe el documento completo a Markdown, fiel al original: no resumas, no corrijas y no resuelvas nada. ` +
      "Fórmulas en LaTeX ($…$ en línea y $$…$$ aparte), tablas en Markdown y una descripción breve entre corchetes de cada figura o diagrama importante. " +
      `Antes del contenido de cada página escribe una línea exactamente así: ${pageMark(1)} (con su número).`,
    [{ inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } }],
  );
}

/**
 * Lee un archivo de Storage y guarda su texto en la fila. Devuelve el texto,
 * o null si no es un PDF ni una imagen, o si no se ha podido sacar nada.
 */
export async function readFileText(supabase: Db, file: FileRef) {
  if (!isReadable(file.mime_type)) return null;
  const { data: blob } = await supabase.storage.from(FILES_BUCKET).download(file.storage_path);
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());

  let text = "";
  let source: "pdf" | "gemini" = "pdf";
  if (file.mime_type === "application/pdf") {
    const pages = await pdfPages(bytes.slice()); // pdf.js se queda con el buffer: se le pasa una copia
    const chars = pages.reduce((n, p) => n + p.length, 0);
    text = pages.map((p, i) => `${pageMark(i + 1)}\n${p}`).join("\n\n");
    if (chars / Math.max(1, pages.length) < MIN_CHARS_PER_PAGE) {
      const transcribed = await transcribe(bytes, file.mime_type);
      if (transcribed) [text, source] = [transcribed, "gemini"];
      else if (!chars) text = "";
    }
  } else {
    [text, source] = [await transcribe(bytes, file.mime_type!), "gemini"];
  }
  if (!text) return null;

  await supabase
    .from("study_files")
    .update({ content_md: text, content_source: source, content_at: new Date().toISOString() })
    .eq("id", file.id);
  return text;
}

/** Divide el texto por las marcas de página (si no las hay, es una sola página). */
function splitPages(text: string) {
  const parts = text.split(PAGE_SPLIT);
  if (parts.length < 3) return [text.trim()];
  const pages: string[] = [];
  for (let i = 1; i < parts.length; i += 2) pages[Number(parts[i]) - 1] = (parts[i + 1] ?? "").trim();
  return Array.from(pages, (p) => p ?? "");
}

/**
 * Texto de un archivo para Claude, desde una página y hasta llenar el trozo.
 * Si aún no se había leído, lo lee ahora y lo guarda.
 */
export async function fileTextForClaude(fileId: string, fromPage = 1) {
  const { supabase } = await requireUser();
  const { data: file } = await supabase
    .from("study_files")
    .select("id, name, kind, storage_path, mime_type, content_md, topics(title), subjects(name)")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) notFound();

  const text = file.content_md ?? (await readFileText(supabase, file));
  if (!text) return `No se puede leer «${file.name}»: solo se leen PDF e imágenes${aiConfigured() ? "" : " (y sin GEMINI_API_KEY, solo PDF con texto)"}.`;

  const pages = splitPages(text);
  const start = Math.min(Math.max(1, fromPage), pages.length);
  let end = start;
  let size = pages[start - 1].length;
  while (end < pages.length && size + pages[end].length <= SLICE_CHARS) size += pages[end++].length;

  const topic = (file.topics as unknown as { title: string } | null)?.title;
  const subject = (file.subjects as unknown as { name: string } | null)?.name;
  const header = [
    `Archivo: ${file.name} (${file.kind})`,
    [subject, topic].filter(Boolean).join(" · "),
    `Páginas ${start}–${end} de ${pages.length}`,
    end < pages.length ? `Para seguir, llama otra vez con desde_pagina = ${end + 1}.` : "Es el final del archivo.",
  ].filter(Boolean);
  const body = pages.slice(start - 1, end).map((p, i) => (pages.length > 1 ? `${pageMark(start + i)}\n${p}` : p));
  return `${header.join("\n")}\n\n${body.join("\n\n")}`;
}
