import Link from "next/link";
import { Suspense } from "react";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, EmptyState, ProgressBar, Skeleton } from "@/components/ui/primitives";
import { countdown } from "@/lib/dates";
import { saveSubject } from "@/features/estudios/actions";
import { CoverArt } from "@/components/ui/cover-art";
import { SubjectFields } from "@/features/estudios/components/fields";
import { getSubjectsOverview } from "@/features/estudios/queries";

export const metadata = { title: "Asignaturas" };

export default function AsignaturasPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Subjects />
    </Suspense>
  );
}

async function Subjects() {
  const { userId, subjects } = await getSubjectsOverview();

  return (
    <>
      {!subjects.length && (
        <EmptyState icon="book" title="Aún no tienes asignaturas">
          Crea tus asignaturas: dentro de cada una tendrás los temas con sus PDF, boletines y contenidos.
        </EmptyState>
      )}

      <div className="divide-y divide-line">
        {subjects.map((s) => (
          <Link key={s.id} href={`/estudios/asignatura/${s.id}`} className="flex items-center gap-3.5 py-3.5">
            <CoverArt item={s} url={s.coverUrl} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] leading-snug font-semibold">{s.name}</span>
              <span className="font-mono text-xs text-muted">
                {[s.code, `${s.topicCount} temas`].filter(Boolean).join(" · ")}
              </span>
              <span className="mt-1 flex items-center gap-2.5">
                <ProgressBar value={s.pct} className="flex-1" />
                <span className="font-mono text-xs text-muted">{s.pct} %</span>
                {s.nextExam && <Chip tone={s.nextExam.days <= 14 ? "acc" : "mut"}>{countdown(s.nextExam.days)}</Chip>}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <FormSheet
        title="Nueva asignatura"
        trigger={{ label: "Añadir asignatura", icon: "plus", variant: "drop" }}
        action={saveSubject.bind(null, null)}
        upload={{ userId, folder: "covers", accept: "image/*", label: "Foto de portada (opcional)" }}
        submitLabel="Crear"
      >
        <SubjectFields />
      </FormSheet>
    </>
  );
}
