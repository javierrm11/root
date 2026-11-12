/** Une clases condicionales. Evita pasar clases de Tailwind que se pisen entre sí. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
