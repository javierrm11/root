"use server";

import { redirect } from "next/navigation";
import { invalid, mutate, upsert } from "@/lib/actions";
import {
  EXPENSE_CATEGORIES,
  FEATURE_COLUMNS,
  IDEA_CRITERIA,
  INVOICE_STATUS,
  LEVELS,
  PROJECT_STATUS,
  keysOf,
  type FeatureColumn,
  type InvoiceStatus,
} from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { coverFields, list, oneOf, optInt, optNumber, optText, text, uploadedFile } from "@/lib/form";
import { removeRowFile } from "@/lib/storage";
import { NEXT_INVOICE_STATUS } from "./logic";

// ─── Clientes ───────────────────────────────────────────────────────
export async function saveClient(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const name = text(fd, "name");
    if (!name) return invalid("Ponle un nombre al cliente");
    return upsert(supabase, "clients", id, {
      name,
      contact_name: optText(fd, "contact_name"),
      contact: optText(fd, "contact"),
      last_contact: optText(fd, "last_contact"),
      notes: optText(fd, "notes"),
    });
  });
}

// ─── Proyectos ──────────────────────────────────────────────────────
export async function saveProject(id: string | null, fd: FormData) {
  return mutate(async ({ supabase, userId }) => {
    const name = text(fd, "name");
    if (!name) return invalid("Ponle un nombre al proyecto");
    const cover = uploadedFile(fd, userId);
    if (id && cover) await removeRowFile(supabase, "projects", id, "cover_path");
    return upsert(supabase, "projects", id, {
      name,
      client_id: optText(fd, "client_id"),
      status: oneOf(fd, "status", keysOf(PROJECT_STATUS), "en_curso"),
      description: optText(fd, "description"),
      budget: optNumber(fd, "budget"),
      start_date: optText(fd, "start_date"),
      end_date: optText(fd, "end_date"),
      tech: list(fd, "tech"),
      website: optText(fd, "website"),
      repo_url: optText(fd, "repo_url"),
      ...coverFields(fd),
      ...(cover && { cover_path: cover.path }),
    });
  });
}

export async function deleteProject(id: string) {
  const result = await mutate(async ({ supabase }) => {
    await removeRowFile(supabase, "projects", id, "cover_path");
    return supabase.from("projects").delete().eq("id", id);
  });
  if (result?.error) return result;
  redirect("/proyectos");
}

// ─── Features ───────────────────────────────────────────────────────
export async function addFeature(projectId: string, fd: FormData) {
  return mutate(async ({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe la feature");
    const { count } = await supabase.from("project_features").select("id", { count: "exact", head: true }).eq("project_id", projectId);
    return supabase.from("project_features").insert({
      project_id: projectId,
      title,
      col: oneOf(fd, "col", keysOf(FEATURE_COLUMNS), "todo"),
      impact: oneOf(fd, "impact", keysOf(LEVELS), "medio"),
      effort: oneOf(fd, "effort", keysOf(LEVELS), "medio"),
      position: count ?? 0,
    });
  });
}

export async function moveFeature(id: string, col: FeatureColumn) {
  return mutate(({ supabase }) => supabase.from("project_features").update({ col }).eq("id", id));
}

// ─── Horas (apuntadas a mano) ───────────────────────────────────────
export async function logHours(fd: FormData) {
  return mutate(({ supabase }) => {
    const projectId = text(fd, "project_id");
    const hours = optNumber(fd, "hours");
    if (!projectId || !hours || hours <= 0 || hours > 24) return invalid("Elige proyecto y unas horas entre 0 y 24");
    return supabase.from("time_entries").insert({ project_id: projectId, hours, day: text(fd, "day") || todayISO(), note: optText(fd, "note") });
  });
}

// ─── Ideas ──────────────────────────────────────────────────────────
export async function saveIdea(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const title = text(fd, "title");
    if (!title) return invalid("Escribe la idea");
    const scores = Object.fromEntries(IDEA_CRITERIA.map((c) => [c.key, Math.min(10, Math.max(1, optInt(fd, c.key) ?? 5))]));
    return upsert(supabase, "ideas", id, { title, description: optText(fd, "description"), ...scores });
  });
}

/** Crea un proyecto propio a partir de una idea y abre su ficha. */
export async function convertIdea(id: string) {
  let projectId: string | null = null;
  const result = await mutate(async ({ supabase }) => {
    const { data: idea, error } = await supabase.from("ideas").select("title, description").eq("id", id).single();
    if (error) return { error };
    const { data: project, error: insertError } = await supabase
      .from("projects")
      .insert({ name: idea.title, description: idea.description, status: "propuesta" })
      .select("id")
      .single();
    if (insertError) return { error: insertError };
    projectId = project.id;
    return supabase.from("ideas").update({ project_id: project.id }).eq("id", id);
  });
  if (result?.error || !projectId) return result;
  redirect(`/proyectos/proyecto/${projectId}`);
}

// ─── Facturas (solo se registran) ───────────────────────────────────
export async function saveInvoice(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const amount = optNumber(fd, "amount");
    if (amount === null || amount < 0) return invalid("Pon el importe");
    const status = oneOf(fd, "status", keysOf(INVOICE_STATUS), "emitida");
    return upsert(supabase, "invoices", id, {
      amount,
      status,
      number: optText(fd, "number"),
      concept: optText(fd, "concept"),
      client_id: optText(fd, "client_id"),
      project_id: optText(fd, "project_id"),
      issue_date: text(fd, "issue_date") || todayISO(),
      due_date: optText(fd, "due_date"),
      paid_date: status === "cobrada" ? optText(fd, "paid_date") || todayISO() : null,
    });
  });
}

export async function cycleInvoiceStatus(id: string, current: InvoiceStatus) {
  const status = NEXT_INVOICE_STATUS[current];
  return mutate(({ supabase }) =>
    supabase.from("invoices").update({ status, paid_date: status === "cobrada" ? todayISO() : null }).eq("id", id),
  );
}

// ─── Gastos ─────────────────────────────────────────────────────────
export async function saveExpense(id: string | null, fd: FormData) {
  return mutate(({ supabase }) => {
    const concept = text(fd, "concept");
    const amount = optNumber(fd, "amount");
    if (!concept || amount === null) return invalid("Pon concepto e importe");
    return upsert(supabase, "expenses", id, {
      concept,
      amount,
      day: text(fd, "day") || todayISO(),
      category: oneOf(fd, "category", keysOf(EXPENSE_CATEGORIES), "otro"),
    });
  });
}
