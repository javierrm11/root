"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_MODE, DEFAULT_PALETTE, PALETTES, STORAGE_KEYS, type Mode, type PaletteId } from "@/lib/theme";
import { Icon } from "@/components/ui/icon";
import { Section } from "@/components/ui/primitives";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "dark", label: "Oscuro suave" },
  { id: "light", label: "Claro" },
];

function applyTheme(palette: PaletteId, mode: Mode) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.mode = mode;
  const entry = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? entry.dark : entry.light);
  try {
    localStorage.setItem(STORAGE_KEYS.palette, palette);
    localStorage.setItem(STORAGE_KEYS.mode, mode);
  } catch {
    // Modo privado: el tema se aplica solo en esta sesión.
  }
}

// El tema vive en los atributos de <html> (los pone el script de <head>); se leen como store externo.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-palette", "data-mode"] });
  return () => observer.disconnect();
}
const readTheme = () => `${document.documentElement.dataset.palette ?? DEFAULT_PALETTE}|${document.documentElement.dataset.mode ?? DEFAULT_MODE}`;
const defaultTheme = () => `${DEFAULT_PALETTE}|${DEFAULT_MODE}`;

/** Selector de paleta y modo. Se guarda en este dispositivo. */
export function ThemePicker() {
  const [palette, mode] = useSyncExternalStore(subscribe, readTheme, defaultTheme).split("|") as [PaletteId, Mode];
  const choose = (nextPalette: PaletteId, nextMode: Mode) => applyTheme(nextPalette, nextMode);

  return (
    <>
      <Section title="Paleta">
        <div className="divide-y divide-line" role="radiogroup" aria-label="Paleta">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={palette === p.id}
              onClick={() => choose(p.id, mode)}
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
            >
              <span className="flex overflow-hidden rounded-lg border border-line" aria-hidden>
                <span className="size-7" style={{ background: mode === "dark" ? p.dark : p.light }} />
                <span className="size-7" style={{ background: p.accent }} />
              </span>
              <span className="flex-1 text-sm font-semibold">{p.name}</span>
              <span className={cn("grid size-6 place-items-center rounded-full", palette === p.id ? "bg-accent text-ink" : "border-[1.5px] border-line")}>
                {palette === p.id && <Icon name="check" size={14} />}
              </span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Modo">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Modo">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => choose(palette, m.id)}
              className={cn("h-10 flex-1 rounded-[9px] text-sm font-semibold", mode === m.id ? "bg-bg text-fg" : "text-muted")}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
