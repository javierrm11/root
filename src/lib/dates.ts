import { APP_TIMEZONE } from "./env";

// Las fechas de calendario se manejan como strings ISO "YYYY-MM-DD" (igual que en Postgres).
// Para operar con ellas se interpretan en UTC, así no hay saltos por horario de verano.

const LOCALE = "es-ES";

/** "Hoy" en la zona horaria de la app. Llamar solo tras leer datos dinámicos (cookies). */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Hora actual "HH:MM" en la zona horaria de la app. */
export function nowTime(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const toISO = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

export function daysBetween(fromISO: string, toISODate: string) {
  return Math.round((parseISODate(toISODate).getTime() - parseISODate(fromISO).getTime()) / 86_400_000);
}

/** Primer día del mes ("YYYY-MM-01") a partir de "YYYY-MM" o de una fecha ISO. */
export function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

export function addMonths(monthStartISO: string, months: number) {
  const date = parseISODate(monthStartISO);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toISO(date);
}

export function daysInMonth(monthStartISO: string) {
  const date = parseISODate(monthStartISO);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

/** 0 = lunes … 6 = domingo */
export function weekdayMonday(iso: string) {
  return (parseISODate(iso).getUTCDay() + 6) % 7;
}

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", ...options }).format(parseISODate(iso)).replace(".", "");

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "mié 26 nov" */
export const formatDay = (iso: string) =>
  format(iso, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
/** "miércoles, 11 de noviembre" */
export const formatLongDay = (iso: string) => format(iso, { weekday: "long", day: "numeric", month: "long" });
/** "noviembre de 2026" */
export const formatMonth = (iso: string) => format(iso, { month: "long", year: "numeric" });
/** "nov" */
export const formatShortMonth = (iso: string) => format(iso, { month: "short" });

/** "09:30:00" → "09:30" */
export const formatTime = (time: string | null | undefined) => (time ? time.slice(0, 5) : "");

/** Cuenta atrás corta: "Hoy", "Mañana", "15 d", "Pasado". */
export function countdown(days: number) {
  if (days < 0) return "Pasado";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `${days} d`;
}
