import { ActionButton } from "@/components/ui/action-button";
import { FormSheet, type Trigger } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Chip, DateBlock } from "@/components/ui/primitives";
import { INVOICE_STATUS } from "@/lib/constants";
import { formatDay, formatShortDay } from "@/lib/dates";
import { formatHours, formatMoney } from "@/lib/format";
import type { TimeEntry } from "@/lib/types";
import { deleteRow } from "@/features/common/actions";
import { cycleInvoiceStatus, logHours, saveInvoice } from "../actions";
import type { InvoiceRowData } from "../queries";
import { HoursFields, InvoiceFields } from "./fields";

type Named = { id: string; name: string };

/** Factura: fecha, cliente, importe y estado (tocar el estado lo cambia). */
export function InvoiceRow({ invoice, clients, projects, today }: { invoice: InvoiceRowData; clients: Named[]; projects: Named[]; today: string }) {
  const status = INVOICE_STATUS[invoice.status];
  const details = [invoice.concept, invoice.due_date && invoice.status !== "cobrada" ? `vence ${formatDay(invoice.due_date)}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex items-start gap-3 py-3">
      <DateBlock iso={invoice.issue_date} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{[invoice.number, invoice.clientName].filter(Boolean).join(" · ")}</p>
        {details && <p className="text-[13px] text-muted">{details}</p>}
        <div className="mt-1 flex gap-4">
          <FormSheet title="Editar factura" trigger={{ label: "Editar" }} action={saveInvoice.bind(null, invoice.id)}>
            <InvoiceFields invoice={invoice} clients={clients} projects={projects} today={today} />
          </FormSheet>
          <ActionButton action={deleteRow.bind(null, "invoices", invoice.id)} confirm="¿Borrar esta factura?" className="min-h-8 text-[13px] font-semibold text-muted">
            Borrar
          </ActionButton>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-sm font-semibold">{formatMoney(invoice.amount)}</span>
        <ActionButton action={cycleInvoiceStatus.bind(null, invoice.id, invoice.status)} label="Cambiar estado de la factura">
          <Chip tone={status.tone}>{status.label}</Chip>
        </ActionButton>
      </div>
    </div>
  );
}

export function AddInvoiceSheet({
  clients,
  projects,
  defaults,
  today,
}: {
  clients: Named[];
  projects: Named[];
  defaults?: { client_id?: string | null; project_id?: string };
  today: string;
}) {
  return (
    <FormSheet title="Registrar factura" trigger={{ label: "Registrar" }} action={saveInvoice.bind(null, null)}>
      <InvoiceFields clients={clients} projects={projects} defaults={defaults} today={today} />
    </FormSheet>
  );
}

/** Formulario para apuntar horas a mano (sin cronómetro). */
export function LogHoursSheet({ projects, projectId, today, trigger }: { projects: Named[]; projectId?: string; today: string; trigger: Trigger }) {
  return (
    <FormSheet title="Apuntar horas" trigger={trigger} action={logHours} submitLabel="Apuntar">
      <HoursFields projects={projects} projectId={projectId} today={today} />
      <p className="text-[13px] text-muted">Con las horas se calcula tu €/hora real en cada proyecto y cliente.</p>
    </FormSheet>
  );
}

export function TimeEntryRow({ entry }: { entry: TimeEntry }) {
  return (
    <div className="flex min-h-12 items-center gap-3 py-2">
      <span className="w-14 shrink-0 font-mono text-[13px] text-muted">{formatShortDay(entry.day)}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold">{entry.note || "Sin nota"}</span>
      <span className="font-mono text-sm font-semibold">{formatHours(Number(entry.hours))}</span>
      <ActionButton
        action={deleteRow.bind(null, "time_entries", entry.id)}
        confirm="¿Borrar estas horas?"
        label="Borrar horas"
        className="grid size-8 place-items-center text-muted"
      >
        <Icon name="x" size={15} />
      </ActionButton>
    </div>
  );
}
