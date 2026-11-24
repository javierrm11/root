import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Brote } from "@/components/ui/brote";
import { Section, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { NOTIFICATIONS, type NotificationKind } from "@/lib/constants";
import { formatDay, formatTime } from "@/lib/dates";
import { deleteRow } from "@/features/common/actions";
import { markAllRead } from "@/features/avisos/actions";
import { getNotifications } from "@/features/avisos/queries";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Avisos" };

/** Fecha y hora de un aviso en Madrid ("25 nov · 08:00"). */
const when = (iso: string) => {
  const madrid = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return `${formatDay(madrid.slice(0, 10))} · ${formatTime(madrid.slice(11, 16))}`;
};
const kindLabel = (kind: string) => (kind in NOTIFICATIONS ? NOTIFICATIONS[kind as NotificationKind].label : "Resumen del día");

export default function AvisosPage() {
  return (
    <>
      <PageHeader title="Avisos" back={{ href: "/", label: "Hoy" }} />
      <Suspense fallback={<Skeleton lines={6} />}>
        <Notifications />
      </Suspense>
    </>
  );
}

async function Notifications() {
  "use cache: private";
  cacheLife("pantalla");
  const { items, scheduled, unread } = await getNotifications();

  return (
    <>
      <Section
        title={unread ? `${unread} sin leer` : "Todo leído"}
        aside={
          unread > 0 && (
            <ActionButton action={markAllRead} className="min-h-9 text-[13px] font-bold text-acc">
              Marcar como leídos
            </ActionButton>
          )
        }
      >
        {items.length ? (
          <div className="divide-y divide-line">
            {items.map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-3">
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read_at ? "bg-line" : "bg-accent")} aria-label={n.read_at ? undefined : "Sin leer"} />
                <Link href={n.url ?? "/"} className="min-w-0 flex-1">
                  <span className={cn("block text-[15px] leading-snug", n.read_at ? "font-semibold" : "font-extrabold")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-[13px] whitespace-pre-line text-muted">{n.body}</span>}
                  <span className="mt-1 block text-xs font-semibold text-muted">
                    {kindLabel(n.kind)} · {when(n.send_at)}
                  </span>
                </Link>
                <ActionButton action={deleteRow.bind(null, "notifications", n.id)} label="Borrar aviso" className="grid size-9 shrink-0 place-items-center text-muted">
                  <Icon name="x" size={15} />
                </ActionButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <Brote size={56} mood="feliz" />
            <p className="text-sm text-muted">Aún no hay avisos. Aquí llegan el resumen de la mañana, lo de la tarde y lo que te deje Claude.</p>
          </div>
        )}
      </Section>

      {scheduled.length > 0 && (
        <Section title="Programados">
          <div className="divide-y divide-line">
            {scheduled.map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-3">
                <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{n.title}</span>
                  <span className="text-xs font-semibold text-muted">{when(n.send_at)}</span>
                </span>
                <ActionButton action={deleteRow.bind(null, "notifications", n.id)} label="Cancelar aviso" className="grid size-9 shrink-0 place-items-center text-muted">
                  <Icon name="x" size={15} />
                </ActionButton>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
