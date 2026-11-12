import { cn } from "@/lib/cn";

export type Bar = { label: string; value: number; display: string };

/**
 * Barras de una sola serie (un color), con la base en 0 para no exagerar los cambios.
 * La última barra se destaca y muestra su valor; el resto lo muestra al pasar por encima.
 * Incluye una tabla oculta para lectores de pantalla.
 */
export function BarChart({ bars, caption }: { bars: Bar[]; caption: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure className="m-0">
      <div className="grid h-[136px] items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }} aria-hidden>
        {bars.map((bar, i) => {
          const last = i === bars.length - 1;
          return (
            <div key={`${bar.label}-${i}`} className="group flex h-full flex-col items-center justify-end gap-1" title={`${bar.label}: ${bar.display}`}>
              <span className={cn("font-mono text-[10px] leading-none", last ? "font-semibold text-fg" : "text-muted opacity-0 group-hover:opacity-100")}>
                {bar.value > 0 ? bar.display : ""}
              </span>
              <span
                className={cn("w-full max-w-[22px] rounded-t-[4px]", last ? "bg-accent" : "bg-surface-2")}
                style={{ height: `${Math.max(bar.value > 0 ? 3 : 0, (bar.value / max) * 82)}%` }}
              />
              <span className="text-[11px] font-semibold text-muted">{bar.label}</span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {bars.map((bar, i) => (
            <tr key={i}>
              <th scope="row">{bar.label}</th>
              <td>{bar.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
