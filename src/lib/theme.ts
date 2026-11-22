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

/**
 * Altura real de la app instalada en iOS (--app-h), antes del primer pintado.
 * En la PWA de iOS con la barra de estado "black-translucent", la ventana mide la pantalla
 * menos la barra de estado y queda un hueco abajo (fallo de WebKit; 100vh/100% no lo arreglan).
 * Instalada, la app ocupa la pantalla entera, así que se usa el alto físico del dispositivo.
 * En navegador o en otros sistemas no se define y el marco usa 100dvh.
 */
export const viewportScript = `(function(){if(!navigator.standalone)return;var d=document.documentElement;function s(){var a=screen.width,b=screen.height,p=matchMedia("(orientation: portrait)").matches;d.style.setProperty("--app-h",(p?Math.max(a,b):Math.min(a,b))+"px")}s();addEventListener("orientationchange",s);addEventListener("resize",s)})();`;
