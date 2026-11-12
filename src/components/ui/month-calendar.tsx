import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/constants";
import { addMonths, daysInMonth, formatMonth, weekdayMonday } from "@/lib/dates";
import { Icon } from "./icon";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Marca de un día: puntos de color, relleno de acento o borde (p. ej. ventana recomendada). */
export type DayMark = { dots?: Tone[]; filled?: boolean; ring?: boolean };
export type LegendItem = { label: string; tone?: Tone; filled?: boolean; ring?: boolean };

/**
 * Calendario mensual genérico (Exámenes, Contenido…). La navegación usa ?mes=YYYY-MM;
 * si se pasa `dayHref`, cada día es un enlace (p. ej. ?dia=YYYY-MM-DD).
 */
export function MonthCalendar({
  month,
  today,
  marks,
  selected,
  legend,
  dayHref,
  query = {},
}: {
  /** Primer día del mes, "YYYY-MM-01". */
  month: string;
  today: string;
  marks: Map<string, DayMark>;
  selected?: string;
  legend: LegendItem[];
  dayHref?: (iso: string) => string;
  /** Otros parámetros que se conservan al cambiar de mes. */
  query?: Record<string, string>;
}) {
  const iso = (day: number) => `${month.slice(0, 8)}${String(day).padStart(2, "0")}`;
  const monthHref = (offset: number) => `?${new URLSearchParams({ ...query, mes: addMonths(month, offset).slice(0, 7) })}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{formatMonth(month)}</h2>
        <div className="flex gap-1.5">
          <Link href={monthHref(-1)} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-xl border border-line">
            <Icon name="chevron-left" size={16} />
          </Link>
          <Link href={monthHref(1)} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-xl border border-line">
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-xs font-semibold text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: weekdayMonday(month) }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth(month) }, (_, i) => {
          const date = iso(i + 1);
          const mark = marks.get(date);
          const className = cn(
            "relative grid h-[38px] place-items-center rounded-[10px] text-sm font-medium",
            date < today && "text-muted",
            mark?.ring && "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--acc)_50%,transparent)]",
            date === today && "bg-fg font-bold text-bg",
            mark?.filled && "bg-accent font-bold text-ink",
            date === selected && "outline-2 -outline-offset-2 outline-acc",
          );
          const content = (
            <>
              {i + 1}
              {!!mark?.dots?.length && (
                <span className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5" aria-hidden>
                  {mark.dots.slice(0, 3).map((tone, k) => (
                    <span key={k} className={cn("size-1 rounded-full bg-[var(--c)]", `tone-${tone}`)} />
                  ))}
                </span>
              )}
            </>
          );
          return dayHref ? (
            <Link key={date} href={dayHref(date)} aria-current={date === selected ? "date" : undefined} className={className}>
              {content}
            </Link>
          ) : (
            <span key={date} className={className}>
              {content}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {legend.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-2.5",
                item.ring ? "rounded-[3px] shadow-[inset_0_0_0_1px_var(--acc)]" : "rounded-full",
                item.filled && "bg-accent",
                item.tone && `tone-${item.tone} bg-[var(--c)]`,
              )}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
