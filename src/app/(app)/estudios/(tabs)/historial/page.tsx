import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, EmptyState, Section, Skeleton, Stat, StatRow, TimelineItem } from "@/components/ui/primitives";
import type { UploadConfig } from "@/lib/upload";
import { EDUCATION_LEVELS } from "@/lib/constants";
import { deleteEducation, saveEducation } from "@/features/estudios/actions";
import { EducationFields } from "@/features/estudios/components/fields";
import { getEducation, type EducationItem } from "@/features/estudios/queries";

export const metadata = { title: "Historial académico" };

export default function HistorialPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <History />
    </Suspense>
  );
}

const certificateUpload = (userId: string): UploadConfig => ({
  userId,
  folder: "education",
  accept: "application/pdf,image/*",
  label: "Certificado o título (opcional)",
});

async function History() {
  const { userId, degrees, courses } = await getEducation();
  const ongoing = [...degrees, ...courses].filter((d) => !d.end_year).length;

  return (
    <>
      <StatRow>
        <Stat value={degrees.length} label="Titulaciones" />
        <Stat value={courses.length} label="Cursos" />
        <Stat value={ongoing} label="En curso" accent />
      </StatRow>

      <Section
        title="Formación"
        aside={
          <FormSheet title="Añadir al historial" trigger={{ label: "Añadir" }} action={saveEducation.bind(null, null)} upload={certificateUpload(userId)}>
            <EducationFields />
          </FormSheet>
        }
      >
        {degrees.length ? (
          <Timeline items={degrees} userId={userId} />
        ) : (
          <EmptyState icon="graduation" title="Tu historial está vacío">
            Añade la ESO, el grado medio, el superior, la carrera… con sus notas y certificados.
          </EmptyState>
        )}
      </Section>

      {courses.length > 0 && (
        <Section title="Cursos y certificados">
          <Timeline items={courses} userId={userId} />
        </Section>
      )}
    </>
  );
}

function Timeline({ items, userId }: { items: EducationItem[]; userId: string }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const current = !item.end_year;
        const details = [EDUCATION_LEVELS[item.level].label, item.center, item.hours ? `${item.hours} h` : null].filter(Boolean).join(" · ");
        return (
          <TimelineItem key={item.id} time={item.start_year ?? "—"} until={item.end_year ?? "hoy"} tone={current ? "acc" : "study"}>
              <p className="text-sm font-semibold">{item.title}</p>
              {details && <p className="text-[13px] text-muted">{details}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <Chip tone={current ? "acc" : "study"}>{current ? "En curso" : item.grade ? `Nota ${item.grade}` : "Completado"}</Chip>
                {item.certificateUrl && (
                  <a href={item.certificateUrl} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-acc">
                    Ver certificado
                  </a>
                )}
                <FormSheet title="Editar" trigger={{ label: "Editar" }} action={saveEducation.bind(null, item.id)} upload={certificateUpload(userId)}>
                  <EducationFields item={item} />
                </FormSheet>
                <ActionButton action={deleteEducation.bind(null, item.id)} confirm={`¿Borrar «${item.title}»?`} className="min-h-8 text-[13px] font-semibold text-muted">
                  Borrar
                </ActionButton>
              </div>
          </TimelineItem>
        );
      })}
    </div>
  );
}
