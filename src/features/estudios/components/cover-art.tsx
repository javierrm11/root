import { cn } from "@/lib/cn";
import type { Subject } from "@/lib/types";
import { subjectInitials } from "../logic";

type CoverSubject = Pick<Subject, "name" | "tone" | "pattern" | "glyph" | "course_year" | "semester">;

/** Portada de asignatura: foto subida o patrón generado con su símbolo. */
export function CoverArt({ subject, url, variant = "thumb" }: { subject: CoverSubject; url: string | null; variant?: "thumb" | "banner" }) {
  const banner = variant === "banner";
  return (
    <div
      className={cn(
        "cover relative shrink-0 overflow-hidden",
        `tone-${subject.tone}`,
        `pat-${subject.pattern}`,
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
          {subject.glyph || subjectInitials(subject.name)}
        </span>
      )}
      {banner && (
        <span className="absolute top-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {subject.course_year}º · {subject.semester}º cuatri
        </span>
      )}
    </div>
  );
}
