"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_MODE, DEFAULT_PALETTE, type Mode, type PaletteId } from "@/lib/theme";
import { Icon } from "@/components/ui/icon";
import { applyTheme } from "./theme-picker";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
};
const readMode = () => (document.documentElement.dataset.mode ?? DEFAULT_MODE) as Mode;

/** Botón rápido de claro / oscuro (la paleta se elige en Ajustes). */
export function ThemeToggle({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => applyTheme((document.documentElement.dataset.palette ?? DEFAULT_PALETTE) as PaletteId, next)}
      aria-label={mode === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn("grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-fg shadow-[var(--shadow)]", className)}
    >
      <Icon name={mode === "dark" ? "sun" : "moon"} size={20} />
    </button>
  );
}
