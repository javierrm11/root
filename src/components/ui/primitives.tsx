import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/constants";
import { formatShortMonth } from "@/lib/dates";
import { Icon, type IconName } from "./icon";

export function Chip({ tone = "mut", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("chip", `tone-${tone}`, className)}>{children}</span>;
}

export function Dot({ tone = "mut" }: { tone?: Tone }) {
  return <span className={cn("dot", `tone-${tone}`)} aria-hidden />;
}

/** Sección plana con línea fina arriba y título pequeño en mayúsculas (estructura B). */
export function Section({
  title,
  aside,
  className,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("border-t border-line py-5 first:border-t-0 first:pt-1", className)}>
      {(title || aside) && (
        <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
          {title && <h2 className="section-title">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function ProgressBar({ value, tone, className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn("block h-1 overflow-hidden rounded-full bg-surface-2", tone && `tone-${tone}`, className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={cn("block h-full rounded-full", tone ? "bg-[var(--c)]" : "bg-accent")} style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * Reparte secciones en dos columnas en ordenador (en el móvil van una debajo de otra).
 * Cada hijo directo es una columna: <Columns><div>…</div><div>…</div></Columns>.
 */
export function Columns({ children }: { children: ReactNode }) {
  return <div className="columns">{children}</div>;
}

/** Fila con título y subtítulo, la pieza básica de las listas. */
export function Row({
  leading,
  title,
  subtitle,
  trailing,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-13 w-full items-center gap-3 py-2 text-left", className)}>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug font-semibold">{title}</span>
        {subtitle && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{subtitle}</span>}
      </span>
      {trailing}
    </div>
  );
}

/** Contenedor de filas separadas por líneas finas. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-line", className)}>{children}</div>;
}

/** Cifra grande con etiqueta, para las filas de estadísticas. */
export function Stat({ value, label, accent }: { value: ReactNode; label: ReactNode; accent?: boolean }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className={cn("text-[26px] leading-tight font-bold tracking-[-0.03em]", accent && "text-acc")}>{value}</span>
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </span>
  );
}

/** Rejilla de 3 estadísticas separadas por líneas verticales. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-3 [&>*]:px-3.5 [&>*:first-child]:pl-0 [&>*+*]:border-l [&>*+*]:border-line">{children}</div>;
}

/** Elemento de timeline: hora (o año) a la izquierda, eje con punto y contenido. */
export function TimelineItem({
  time,
  until,
  tone = "mut",
  now,
  trailing,
  children,
}: {
  time: ReactNode;
  until?: ReactNode;
  tone?: Tone;
  now?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("tl-item grid grid-cols-[48px_20px_minmax(0,1fr)_auto] gap-2 pb-5 last:pb-0", now && "is-now")}>
      <span className="font-mono text-[13px] leading-snug font-semibold">
        {time}
        {until && <span className="block text-xs font-normal text-muted">{until}</span>}
      </span>
      <span className="tl-axis">
        <span className={cn("dot", `tone-${tone}`)} />
      </span>
      <div className="min-w-0">{children}</div>
      <div>{trailing}</div>
    </div>
  );
}

/** Bloque de fecha "26 / NOV" para filas de exámenes, facturas… */
export function DateBlock({ iso }: { iso: string }) {
  return (
    <span className="flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2">
      <span className="text-lg leading-none font-bold">{Number(iso.slice(8, 10))}</span>
      <span className="mt-0.5 text-[11px] font-semibold text-muted uppercase">{formatShortMonth(iso)}</span>
    </span>
  );
}

/** Filtro con pastillas que son enlaces (?periodo=…), sin JS. */
export function LinkPills({ items }: { items: Array<{ href: string; label: string; active: boolean; count?: number }> }) {
  return (
    <nav className="-mx-5 mb-4 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-semibold",
            item.active ? "bg-fg text-bg" : "bg-surface-2 text-muted",
          )}
        >
          {item.label}
          {item.count !== undefined && <span className="font-mono opacity-70">{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Barra de progreso por pasos (fases de un vídeo, de un proceso…). */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, i) => (
        <li key={label} aria-current={i === current ? "step" : undefined} className="flex flex-col gap-1.5 text-center">
          <span className={cn("h-1 rounded-full", i <= current ? "bg-accent" : "bg-surface-2")} />
          <span className={cn("text-[11px] font-semibold", i === current ? "text-acc" : "text-muted")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <span className="tinted tone-acc mb-1 grid size-12 place-items-center rounded-2xl">
        <Icon name={icon} size={22} />
      </span>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-4 py-2" aria-busy aria-label="Cargando">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="h-3.5 w-2/3 rounded bg-surface-2" />
          <span className="h-3 w-2/5 rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
