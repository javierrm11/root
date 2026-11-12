import { cn } from "@/lib/cn";
import { COVER_PATTERNS, SUBJECT_TONES, toOptions } from "@/lib/constants";
import type { Cover } from "@/lib/types";
import { ChoicePills, Field, Input } from "./field";

/** Iniciales para la portada cuando no hay símbolo. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || name.slice(0, 2).toUpperCase();

/** Portada de asignatura o proyecto: foto subida o patrón generado con su símbolo. */
export function CoverArt({
  item,
  url,
  variant = "thumb",
  badge,
}: {
  item: Pick<Cover, "tone" | "pattern" | "glyph"> & { name: string };
  url: string | null;
  variant?: "thumb" | "banner";
  badge?: string;
}) {
  const banner = variant === "banner";
  return (
    <div
      className={cn(
        "cover relative shrink-0 overflow-hidden",
        `tone-${item.tone}`,
        `pat-${item.pattern}`,
        banner ? "h-[150px] w-full rounded-2xl" : "size-[72px] rounded-2xl",
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "absolute font-mono leading-none font-bold tracking-tighter text-black/30",
            banner ? "right-4 bottom-2 text-[88px]" : "inset-0 grid place-items-center text-[26px]",
          )}
        >
          {item.glyph || initials(item.name)}
        </span>
      )}
      {banner && badge && (
        <span className="absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">{badge}</span>
      )}
    </div>
  );
}

/** Campos de portada generada: símbolo, color y patrón. Se leen con coverFields() en lib/form.ts. */
export function CoverFields({ value, defaults }: { value?: Pick<Cover, "tone" | "pattern" | "glyph">; defaults?: Pick<Cover, "tone" | "pattern"> }) {
  return (
    <>
      <Field label="Símbolo de la portada" hint="Hasta 4 caracteres; si lo dejas vacío, usa las iniciales">
        <Input name="glyph" maxLength={4} defaultValue={value?.glyph ?? ""} placeholder="{ }" />
      </Field>
      <ChoicePills label="Color" name="tone" options={toOptions(SUBJECT_TONES)} defaultValue={value?.tone ?? defaults?.tone ?? "study"} />
      <ChoicePills label="Portada generada" name="pattern" options={toOptions(COVER_PATTERNS)} defaultValue={value?.pattern ?? defaults?.pattern ?? "dots"} />
    </>
  );
}
