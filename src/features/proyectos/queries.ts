import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { groupBy, sum } from "@/lib/collections";
import { monthStart, periodStart, todayISO, type Period } from "@/lib/dates";
import { ratio } from "@/lib/format";
import { signPaths } from "@/lib/storage";
import { must, requireUser } from "@/lib/supabase/server";
import type { Client, Expense, Idea, Invoice, Project, ProjectFeature, TimeEntry } from "@/lib/types";
import { ideaScore, projectIncome } from "./logic";

/** Todo lo del módulo freelance, una vez por petición. */
const loadFreelance = cache(async () => {
  const { supabase, userId } = await requireUser();
  const today = todayISO();
  const [clients, projects, features, entries, invoices] = await Promise.all([
    supabase.from("clients").select("*").order("name").then(must<Client[]>),
    supabase.from("projects").select("*").order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).then(must<Project[]>),
    supabase.from("project_features").select("*").order("position").order("created_at").then(must<ProjectFeature[]>),
    supabase.from("time_entries").select("*").order("day", { ascending: false }).order("created_at", { ascending: false }).then(must<TimeEntry[]>),
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }).then(must<Invoice[]>),
  ]);

  const featuresBy = groupBy(features, (f) => f.project_id);
  const entriesBy = groupBy(entries, (e) => e.project_id);
  const invoicesBy = groupBy(invoices, (i) => i.project_id);
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "Proyecto propio";

  const summaries = projects.map((p) => {
    const fs = featuresBy.get(p.id) ?? [];
    const hours = sum(entriesBy.get(p.id) ?? [], (e) => e.hours);
    const invoiced = sum(invoicesBy.get(p.id) ?? [], (i) => i.amount);
    const income = projectIncome(invoiced, p.budget);
    return {
      ...p,
      clientName: clientName(p.client_id),
      hours,
      invoiced,
      income,
      perHour: income > 0 ? ratio(income, hours) : null,
      done: fs.filter((f) => f.col === "done").length,
      total: fs.length,
      doing: fs.filter((f) => f.col === "doing").map((f) => f.title),
    };
  });

  return { supabase, userId, today, clients, projects: summaries, features: featuresBy, entries, invoices, clientName };
});

export type ProjectSummary = Awaited<ReturnType<typeof loadFreelance>>["projects"][number];
export type InvoiceRowData = Invoice & { clientName: string };

const pending = (invoices: Invoice[]) => invoices.filter((i) => i.status !== "cobrada");

/** Pestaña Proyectos: en curso y terminados, con portada y €/hora real. */
export async function getProjectsOverview() {
  const { supabase, userId, today, projects, entries, clients } = await loadFreelance();
  const covers = await signPaths(supabase, projects.map((p) => p.cover_path));
  const withCover = projects.map((p) => ({ ...p, coverUrl: p.cover_path ? (covers.get(p.cover_path) ?? null) : null }));
  const paid = projects.filter((p) => p.income > 0 && p.hours > 0);
  return {
    userId,
    clients,
    active: withCover.filter((p) => p.status !== "entregado"),
    delivered: withCover.filter((p) => p.status === "entregado"),
    stats: {
      active: projects.filter((p) => p.status === "en_curso").length,
      perHour: ratio(sum(paid, (p) => p.income), sum(paid, (p) => p.hours)),
      monthHours: sum(entries.filter((e) => e.day >= monthStart(today)), (e) => e.hours),
    },
  };
}

/** Dentro de un proyecto: ficha, features, horas y facturas. */
export async function getProjectDetail(id: string) {
  const { supabase, userId, today, projects, features, entries, invoices, clients, clientName } = await loadFreelance();
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();
  const urls = await signPaths(supabase, [project.cover_path]);
  return {
    userId,
    today,
    clients,
    project,
    coverUrl: project.cover_path ? (urls.get(project.cover_path) ?? null) : null,
    features: features.get(id) ?? [],
    entries: entries.filter((e) => e.project_id === id),
    invoices: invoices.filter((i) => i.project_id === id).map((i) => ({ ...i, clientName: clientName(i.client_id) })),
    activeProjects: projects.filter((p) => p.status !== "entregado"),
  };
}

/** Pestaña Ideas: ordenadas por nota. */
export async function getIdeas() {
  const { supabase } = await requireUser();
  const ideas = await supabase.from("ideas").select("*").order("created_at", { ascending: false }).then(must<Idea[]>);
  return ideas.map((idea) => ({ ...idea, score: ideaScore(idea) })).sort((a, b) => b.score - a.score);
}

/** Pestaña Clientes: total facturado, €/hora y sus proyectos. */
export async function getClientsOverview() {
  const { clients, projects, invoices } = await loadFreelance();
  return clients.map((client) => {
    const own = projects.filter((p) => p.client_id === client.id);
    return {
      ...client,
      projects: own,
      invoiced: sum(invoices.filter((i) => i.client_id === client.id), (i) => i.amount),
      perHour: ratio(sum(own, (p) => p.income), sum(own, (p) => p.hours)),
    };
  });
}

/** Pestaña Finanzas: balance del periodo, facturas, gastos y €/hora por cliente. */
export async function getFinances(period: Period) {
  const { supabase, today, invoices, entries, clientName, clients, projects } = await loadFreelance();
  const start = periodStart(today, period);
  const expenses = await supabase.from("expenses").select("*").gte("day", start).order("day", { ascending: false }).then(must<Expense[]>);

  const inPeriod = invoices.filter((i) => i.issue_date >= start);
  const billed = sum(inPeriod, (i) => i.amount);
  const collected = sum(inPeriod.filter((i) => i.status === "cobrada"), (i) => i.amount);
  const spent = sum(expenses, (e) => e.amount);
  const hours = sum(entries.filter((e) => e.day >= start), (e) => e.hours);

  // Facturas del periodo y cualquier otra que siga sin cobrar.
  const listed = invoices.filter((i) => i.issue_date >= start || i.status !== "cobrada");

  const perClient = clients
    .map((c) => {
      const own = projects.filter((p) => p.client_id === c.id);
      return { id: c.id, name: c.name, perHour: ratio(sum(own, (p) => p.income), sum(own, (p) => p.hours)) };
    })
    .filter((c): c is { id: string; name: string; perHour: number } => c.perHour !== null)
    .sort((a, b) => b.perHour - a.perHour);

  return {
    start,
    billed,
    collected,
    outstanding: sum(pending(invoices), (i) => i.amount),
    spent,
    hours,
    perHour: ratio(billed, hours),
    invoices: listed.map((i) => ({ ...i, clientName: clientName(i.client_id) })),
    expenses,
    perClient,
    clients,
    projects,
  };
}

/** Total pendiente de cobro (cabecera de Proyectos). */
export async function getOutstanding() {
  const { invoices } = await loadFreelance();
  return sum(pending(invoices), (i) => i.amount);
}

/** Lo que importa hoy del freelance: facturas por cobrar y features en curso. */
export async function getFreelanceToday() {
  const { invoices, projects, clientName } = await loadFreelance();
  return {
    pending: pending(invoices)
      .slice(0, 3)
      .map((i) => ({ ...i, clientName: clientName(i.client_id) })),
    inProgress: projects.filter((p) => p.status === "en_curso" && p.doing.length > 0).slice(0, 3),
  };
}
