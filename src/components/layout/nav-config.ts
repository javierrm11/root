import type { Tone } from "@/lib/constants";
import type { IconName } from "@/components/ui/icon";

export type NavItem = { href: string; label: string; icon?: IconName; exact?: boolean };
export type MenuItem = NavItem & { icon: IconName; short: string; hint: string; tone: Tone };

/** Los 5 módulos: barra inferior en el móvil y menú lateral en tablet y ordenador. */
export const MODULES: NavItem[] = [
  { href: "/", label: "Hoy", icon: "home", exact: true },
  { href: "/estudios", label: "Estudios", icon: "book" },
  { href: "/proyectos", label: "Proyectos", icon: "work" },
  { href: "/contenido", label: "Contenido", icon: "video" },
  { href: "/gym", label: "Gym", icon: "gym" },
];

/** Módulos de apoyo: menú del avatar en el móvil y parte baja del menú lateral. */
export const MENU: MenuItem[] = [
  { href: "/habitos", label: "Hábitos", short: "Hábitos", hint: "Tus rutinas diarias y rachas", icon: "flame", tone: "gym" },
  { href: "/objetivos", label: "Objetivos del trimestre", short: "Objetivos", hint: "Conectados a tus módulos", icon: "target", tone: "acc" },
  { href: "/revision", label: "Revisión semanal", short: "Revisión", hint: "Resumen y plan con Gemini", icon: "repeat", tone: "study" },
  { href: "/bandeja", label: "Bandeja de entrada", short: "Bandeja", hint: "Lo que apuntas con el botón +", icon: "inbox", tone: "work" },
  { href: "/ajustes", label: "Ajustes", short: "Ajustes", hint: "Paleta, IA, Claude y notificaciones", icon: "settings", tone: "mut" },
];
