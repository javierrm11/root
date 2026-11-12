import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { Chip, EmptyState, Row, RowList, Skeleton } from "@/components/ui/primitives";
import { INBOX_KINDS } from "@/lib/constants";
import { APP_TIMEZONE } from "@/lib/env";
import { deleteRow } from "@/features/common/actions";
import { processInboxItem } from "@/features/hoy/actions";
import { getInbox } from "@/features/hoy/queries";

export const metadata = { title: "Bandeja de entrada" };

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: APP_TIMEZONE });

export default function BandejaPage() {
  return (
    <>
      <PageHeader title="Bandeja" eyebrow="Lo que apuntas con el botón +" back={{ href: "/", label: "Hoy" }} />
      <Suspense fallback={<Skeleton lines={4} />}>
        <Inbox />
      </Suspense>
    </>
  );
}

async function Inbox() {
  const items = await getInbox();
  if (!items.length) {
    return (
      <EmptyState icon="inbox" title="Bandeja vacía">
        Usa el botón + para apuntar cualquier idea o tarea al vuelo y clasifícala aquí después.
      </EmptyState>
    );
  }
  return (
    <RowList>
      {items.map((item) => (
        <Row
          key={item.id}
          leading={<Chip tone={INBOX_KINDS[item.kind].tone}>{INBOX_KINDS[item.kind].label}</Chip>}
          title={<span className="font-medium whitespace-pre-line">{item.content}</span>}
          subtitle={dateFormat.format(new Date(item.created_at))}
          trailing={
            <span className="flex">
              <ActionButton action={processInboxItem.bind(null, item.id)} label="Marcar como clasificado" className="grid size-9 place-items-center text-acc">
                <Icon name="check" size={18} />
              </ActionButton>
              <ActionButton
                action={deleteRow.bind(null, "inbox_items", item.id)}
                confirm="¿Borrar esta nota?"
                label="Borrar"
                className="grid size-9 place-items-center text-muted"
              >
                <Icon name="trash" size={16} />
              </ActionButton>
            </span>
          }
        />
      ))}
    </RowList>
  );
}
