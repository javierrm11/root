// Campos compartidos entre "crear" y "editar" del módulo freelance.
import { CoverFields } from "@/components/ui/cover-art";
import { ChoicePills, Field, FieldRow, Input, Select, Textarea } from "@/components/ui/field";
import {
  EXPENSE_CATEGORIES,
  FEATURE_COLUMNS,
  INVOICE_STATUS,
  LEVELS,
  PROJECT_STATUS,
  toOptions,
  type FeatureColumn,
} from "@/lib/constants";
import type { Client, Expense, Invoice, Project } from "@/lib/types";

type Named = { id: string; name: string };
const options = (items: Named[]) => items.map((i) => ({ value: i.id, label: i.name }));

export function ClientFields({ client }: { client?: Client }) {
  return (
    <>
      <Field label="Nombre o empresa">
        <Input name="name" required defaultValue={client?.name} placeholder="Tienda Lola" />
      </Field>
      <FieldRow>
        <Field label="Persona de contacto">
          <Input name="contact_name" defaultValue={client?.contact_name ?? ""} placeholder="Lola · dueña" />
        </Field>
        <Field label="Contacto">
          <Input name="contact" defaultValue={client?.contact ?? ""} placeholder="WhatsApp, email…" />
        </Field>
      </FieldRow>
      <Field label="Última interacción">
        <Input name="last_contact" type="date" defaultValue={client?.last_contact ?? ""} />
      </Field>
      <Field label="Notas">
        <Textarea name="notes" defaultValue={client?.notes ?? ""} placeholder="Cómo paga, qué prefiere, próximas ideas…" />
      </Field>
    </>
  );
}

export function ProjectFields({ project, clients }: { project?: Project; clients: Named[] }) {
  return (
    <>
      <Field label="Nombre">
        <Input name="name" required defaultValue={project?.name} placeholder="Web y tienda online" />
      </Field>
      <Field label="Cliente">
        <Select name="client_id" defaultValue={project?.client_id ?? ""} placeholder="Proyecto propio" options={options(clients)} />
      </Field>
      <ChoicePills label="Estado" name="status" options={toOptions(PROJECT_STATUS)} defaultValue={project?.status ?? "en_curso"} />
      <Field label="Descripción">
        <Textarea name="description" defaultValue={project?.description ?? ""} />
      </Field>
      <FieldRow>
        <Field label="Presupuesto (€)">
          <Input name="budget" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={project?.budget ?? ""} />
        </Field>
        <Field label="Tecnologías" hint="Separadas por comas">
          <Input name="tech" defaultValue={project?.tech.join(", ") ?? ""} placeholder="Next.js, Stripe" />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Inicio">
          <Input name="start_date" type="date" defaultValue={project?.start_date ?? ""} />
        </Field>
        <Field label="Entrega">
          <Input name="end_date" type="date" defaultValue={project?.end_date ?? ""} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Web">
          <Input name="website" type="url" defaultValue={project?.website ?? ""} placeholder="https://" />
        </Field>
        <Field label="Repositorio">
          <Input name="repo_url" type="url" defaultValue={project?.repo_url ?? ""} placeholder="https://" />
        </Field>
      </FieldRow>
      <CoverFields value={project} defaults={{ tone: "acc", pattern: "grid" }} />
    </>
  );
}

export function FeatureFields({ col = "todo" }: { col?: FeatureColumn }) {
  return (
    <>
      <Field label="Feature">
        <Input name="title" required placeholder="Pago con Stripe" />
      </Field>
      <ChoicePills label="Columna" name="col" options={toOptions(FEATURE_COLUMNS)} defaultValue={col} />
      <ChoicePills label="Impacto" name="impact" options={toOptions(LEVELS)} defaultValue="medio" />
      <ChoicePills label="Esfuerzo" name="effort" options={toOptions(LEVELS)} defaultValue="medio" />
    </>
  );
}

/** Horas apuntadas a mano. Con `projectId` el proyecto va fijo. */
export function HoursFields({ projects, projectId, today }: { projects: Named[]; projectId?: string; today: string }) {
  return (
    <>
      {projectId ? (
        <input type="hidden" name="project_id" value={projectId} />
      ) : (
        <Field label="Proyecto">
          <Select name="project_id" required defaultValue="" placeholder="Elige proyecto" options={options(projects)} />
        </Field>
      )}
      <FieldRow>
        <Field label="Día">
          <Input name="day" type="date" required defaultValue={today} />
        </Field>
        <Field label="Horas">
          <Input name="hours" type="number" inputMode="decimal" required min={0.25} max={24} step={0.25} placeholder="2,5" />
        </Field>
      </FieldRow>
      <Field label="Qué hiciste">
        <Input name="note" placeholder="Carrito y pago con Stripe" />
      </Field>
    </>
  );
}

export function InvoiceFields({
  invoice,
  clients,
  projects,
  defaults,
  today,
}: {
  invoice?: Invoice;
  clients: Named[];
  projects: Named[];
  defaults?: { client_id?: string | null; project_id?: string };
  today: string;
}) {
  return (
    <>
      <FieldRow>
        <Field label="Importe (€)">
          <Input name="amount" type="number" inputMode="decimal" required min={0} step="0.01" defaultValue={invoice?.amount ?? ""} />
        </Field>
        <Field label="Número">
          <Input name="number" defaultValue={invoice?.number ?? ""} placeholder="F-07" />
        </Field>
      </FieldRow>
      <Field label="Concepto">
        <Input name="concept" defaultValue={invoice?.concept ?? ""} placeholder="Primer pago de la web" />
      </Field>
      <Field label="Cliente">
        <Select name="client_id" defaultValue={invoice?.client_id ?? defaults?.client_id ?? ""} placeholder="Sin cliente" options={options(clients)} />
      </Field>
      <Field label="Proyecto">
        <Select name="project_id" defaultValue={invoice?.project_id ?? defaults?.project_id ?? ""} placeholder="Sin proyecto" options={options(projects)} />
      </Field>
      <FieldRow>
        <Field label="Emitida">
          <Input name="issue_date" type="date" required defaultValue={invoice?.issue_date ?? today} />
        </Field>
        <Field label="Vence">
          <Input name="due_date" type="date" defaultValue={invoice?.due_date ?? ""} />
        </Field>
      </FieldRow>
      <ChoicePills label="Estado" name="status" options={toOptions(INVOICE_STATUS)} defaultValue={invoice?.status ?? "emitida"} />
    </>
  );
}

export function ExpenseFields({ expense, today }: { expense?: Expense; today: string }) {
  return (
    <>
      <Field label="Concepto">
        <Input name="concept" required defaultValue={expense?.concept} placeholder="Hosting" />
      </Field>
      <FieldRow>
        <Field label="Importe (€)">
          <Input name="amount" type="number" inputMode="decimal" required min={0} step="0.01" defaultValue={expense?.amount ?? ""} />
        </Field>
        <Field label="Día">
          <Input name="day" type="date" required defaultValue={expense?.day ?? today} />
        </Field>
      </FieldRow>
      <Field label="Categoría">
        <Select name="category" defaultValue={expense?.category ?? "software"} options={toOptions(EXPENSE_CATEGORIES)} />
      </Field>
    </>
  );
}
