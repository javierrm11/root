import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Dot, EmptyState, Row, RowList, Skeleton } from "@/components/ui/primitives";
import { PROJECT_STATUS } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { formatHours, formatMoney, formatPerHour } from "@/lib/format";
import { initials } from "@/components/ui/cover-art";
import { deleteRow } from "@/features/common/actions";
import { saveClient } from "@/features/proyectos/actions";
import { ClientFields } from "@/features/proyectos/components/fields";
import { getClientsOverview } from "@/features/proyectos/queries";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <Suspense fallback={<Skeleton lines={4} />}>
      <Clients />
    </Suspense>
  );
}

async function Clients() {
  const clients = await getClientsOverview();

  return (
    <>
      {!clients.length && (
        <EmptyState icon="user" title="Sin clientes todavía">
          Añade a quién le trabajas para ver cuánto te ha pagado y tu €/hora real con cada uno.
        </EmptyState>
      )}

      <div className="border-b border-line">
        {clients.map((client) => (
          <details key={client.id} className="group border-t border-line first:border-t-0">
            <summary className="flex min-h-16 items-center gap-3 py-3">
              <span className="tinted tone-study grid size-[42px] shrink-0 place-items-center rounded-full text-sm font-bold">{initials(client.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{client.name}</span>
                <span className="block text-[13px] text-muted">{client.contact_name ?? `${client.projects.length} proyectos`}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="font-mono text-sm font-semibold">{formatMoney(client.invoiced)}</span>
                <span className="font-mono text-xs text-muted">{formatPerHour(client.perHour)}</span>
              </span>
            </summary>
            <div className="flex flex-col gap-1 pb-4">
              <div className="grid grid-cols-2 gap-3 py-2">
                <span>
                  <span className="block text-[13px] text-muted">Contacto</span>
                  <span className="block text-sm font-semibold">{client.contact ?? "—"}</span>
                </span>
                <span>
                  <span className="block text-[13px] text-muted">Última interacción</span>
                  <span className="block text-sm font-semibold">{client.last_contact ? formatDay(client.last_contact) : "—"}</span>
                </span>
              </div>
              {client.projects.length > 0 && (
                <RowList>
                  {client.projects.map((p) => (
                    <Link key={p.id} href={`/proyectos/proyecto/${p.id}`} className="block">
                      <Row
                        leading={<Dot tone={PROJECT_STATUS[p.status].tone} />}
                        title={p.name}
                        subtitle={`${PROJECT_STATUS[p.status].label} · ${formatMoney(p.income)} · ${formatHours(p.hours)}`}
                        trailing={<Icon name="chevron-right" size={18} className="text-muted" />}
                      />
                    </Link>
                  ))}
                </RowList>
              )}
              {client.notes && <p className="py-2 text-[13px] whitespace-pre-line text-muted">{client.notes}</p>}
              <div className="flex gap-4">
                <FormSheet title="Editar cliente" trigger={{ label: "Editar" }} action={saveClient.bind(null, client.id)}>
                  <ClientFields client={client} />
                </FormSheet>
                <ActionButton
                  action={deleteRow.bind(null, "clients", client.id)}
                  confirm={`¿Borrar «${client.name}»? Sus proyectos se quedan como propios.`}
                  className="min-h-8 text-[13px] font-semibold text-muted"
                >
                  Borrar
                </ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>

      <FormSheet title="Nuevo cliente" trigger={{ label: "Añadir cliente", icon: "plus", variant: "drop" }} action={saveClient.bind(null, null)} submitLabel="Crear">
        <ClientFields />
      </FormSheet>
    </>
  );
}
