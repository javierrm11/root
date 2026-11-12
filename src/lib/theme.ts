// Paletas disponibles. Los colores viven en globals.css; aquí solo lo que necesita JS.

export const PALETTES = [
  { id: "grafito", name: "Grafito y lima", dark: "#1F2024", light: "#F6F6F3", accent: "#C5F06A" },
  { id: "indigo", name: "Pizarra e índigo", dark: "#1C1E26", light: "#F4F5F9", accent: "#9C9EFF" },
  { id: "oceano", name: "Océano y menta", dark: "#1A2129", light: "#F3F6F8", accent: "#5FE0C1" },
  { id: "bosque", name: "Bosque y ámbar", dark: "#1E2220", light: "#F5F4EF", accent: "#F2B544" },
  { id: "ciruela", name: "Ciruela y coral", dark: "#221E25", light: "#F8F5F6", accent: "#FF8A6B" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
export type Mode = "dark" | "light";

export const DEFAULT_PALETTE: PaletteId = "grafito";
export const DEFAULT_MODE: Mode = "dark";
export const STORAGE_KEYS = { palette: "root-palette", mode: "root-mode" } as const;

/** Script que aplica el tema guardado antes del primer pintado (evita parpadeo). */
export const themeScript = `(function(){try{var d=document.documentElement;d.dataset.palette=localStorage.getItem("${STORAGE_KEYS.palette}")||"${DEFAULT_PALETTE}";d.dataset.mode=localStorage.getItem("${STORAGE_KEYS.mode}")||"${DEFAULT_MODE}";}catch(e){}})();`;
