// Campos de formulario compartidos entre "crear" y "editar".
import { CoverFields } from "@/components/ui/cover-art";
import { ChoicePills, Field, FieldRow, Input, Select, Textarea } from "@/components/ui/field";
import { EDUCATION_KINDS, EDUCATION_LEVELS, EXAM_KINDS, toOptions } from "@/lib/constants";
import type { Education, Exam, Subject } from "@/lib/types";

const subjectOptions = (subjects: Pick<Subject, "id" | "name">[]) => subjects.map((s) => ({ value: s.id, label: s.name }));

export function SubjectFields({ subject }: { subject?: Subject }) {
  return (
    <>
      <Field label="Nombre">
        <Input name="name" required defaultValue={subject?.name} placeholder="Introducción a la Programación" />
      </Field>
      <Field label="Código">
        <Input name="code" defaultValue={subject?.code ?? ""} placeholder="GIINF-1.1" />
      </Field>
      <FieldRow>
        <Field label="Curso">
          <Input name="course_year" type="number" inputMode="numeric" min={1} max={6} defaultValue={subject?.course_year ?? 1} />
        </Field>
        <Field label="Cuatrimestre">
          <Select
            name="semester"
            defaultValue={String(subject?.semester ?? 1)}
            options={[
              { value: "1", label: "1º cuatrimestre" },
              { value: "2", label: "2º cuatrimestre" },
            ]}
          />
        </Field>
      </FieldRow>
      <Field label="Descripción">
        <Textarea name="description" defaultValue={subject?.description ?? ""} placeholder="De qué va la asignatura" />
      </Field>
      <CoverFields value={subject} />
    </>
  );
}

export function ExamFields({
  subjects,
  exam,
  subjectId,
}: {
  subjects: Pick<Subject, "id" | "name">[];
  exam?: Exam;
  /** Si se fija, no se muestra el selector de asignatura. */
  subjectId?: string;
}) {
  return (
    <>
      {subjectId ? (
        <input type="hidden" name="subject_id" value={subjectId} />
      ) : (
        <Field label="Asignatura">
          <Select name="subject_id" required defaultValue={exam?.subject_id ?? ""} placeholder="Elige asignatura" options={subjectOptions(subjects)} />
        </Field>
      )}
      <ChoicePills label="Tipo" name="kind" options={toOptions(EXAM_KINDS)} defaultValue={exam?.kind ?? "final"} />
      <FieldRow>
        <Field label="Fecha">
          <Input name="exam_date" type="date" required defaultValue={exam?.exam_date} />
        </Field>
        <Field label="Hora">
          <Input name="start_time" type="time" defaultValue={exam?.start_time?.slice(0, 5) ?? ""} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Título (opcional)">
          <Input name="title" defaultValue={exam?.title ?? ""} placeholder="Temas 1–4" />
        </Field>
        <Field label="Nota">
          <Input name="grade" type="number" inputMode="decimal" step="0.01" min={0} max={10} defaultValue={exam?.grade ?? ""} />
        </Field>
      </FieldRow>
    </>
  );
}

export function FlashcardFields({ subjects, subjectId }: { subjects: Pick<Subject, "id" | "name">[]; subjectId?: string }) {
  return (
    <>
      <Field label="Asignatura">
        <Select name="subject_id" required defaultValue={subjectId ?? ""} placeholder="Elige asignatura" options={subjectOptions(subjects)} />
      </Field>
      <Field label="Pregunta">
        <Textarea name="front" required placeholder="¿Qué diferencia hay entre while y do-while?" />
      </Field>
      <Field label="Respuesta">
        <Textarea name="back" required />
      </Field>
    </>
  );
}

export function EducationFields({ item }: { item?: Education }) {
  return (
    <>
      <ChoicePills label="Tipo" name="kind" options={toOptions(EDUCATION_KINDS)} defaultValue={item?.kind ?? "titulacion"} />
      <Field label="Nivel">
        <Select name="level" defaultValue={item?.level ?? "grado"} options={toOptions(EDUCATION_LEVELS)} />
      </Field>
      <Field label="Título">
        <Input name="title" required defaultValue={item?.title} placeholder="CFGS Desarrollo de Aplicaciones Web" />
      </Field>
      <Field label="Centro">
        <Input name="center" defaultValue={item?.center ?? ""} />
      </Field>
      <FieldRow>
        <Field label="Año de inicio">
          <Input name="start_year" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={item?.start_year ?? ""} />
        </Field>
        <Field label="Año de fin" hint="Vacío si está en curso">
          <Input name="end_year" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={item?.end_year ?? ""} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Horas">
          <Input name="hours" type="number" inputMode="numeric" min={0} defaultValue={item?.hours ?? ""} />
        </Field>
        <Field label="Nota">
          <Input name="grade" defaultValue={item?.grade ?? ""} placeholder="8,4" />
        </Field>
      </FieldRow>
    </>
  );
}
