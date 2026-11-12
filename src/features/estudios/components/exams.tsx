import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { MonthCalendar, type DayMark } from "@/components/ui/month-calendar";
import { Chip, DateBlock } from "@/components/ui/primitives";
import { EXAM_KINDS } from "@/lib/constants";
import { countdown, formatTime } from "@/lib/dates";
import type { Exam, Subject } from "@/lib/types";
import { deleteRow } from "@/features/common/actions";
import { saveExam } from "../actions";
import { ExamFields } from "./fields";

/** Calendario mensual con exámenes (acento) y días con estudio en la agenda (punto). */
export function ExamCalendar({
  month,
  today,
  examDays,
  studyDays,
}: {
  month: string;
  today: string;
  examDays: Set<string>;
  studyDays: Set<string>;
}) {
  const marks = new Map<string, DayMark>();
  studyDays.forEach((day) => marks.set(day, { dots: ["study"] }));
  examDays.forEach((day) => marks.set(day, { filled: true }));
  return (
    <MonthCalendar
      month={month}
      today={today}
      marks={marks}
      legend={[
        { label: "Examen", filled: true },
        { label: "Estudio en la agenda", tone: "study" },
      ]}
    />
  );
}

/** Fila de examen con fecha, cuenta atrás y acciones. Se usa en Exámenes y dentro de la asignatura. */
export function ExamRow({
  exam,
  days,
  title,
  subtitle,
  subjects,
  fixedSubject,
}: {
  exam: Exam;
  days: number | null;
  title: string;
  subtitle?: string;
  subjects: Pick<Subject, "id" | "name">[];
  fixedSubject?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <DateBlock iso={exam.exam_date} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          {EXAM_KINDS[exam.kind].label} · {title}
        </span>
        <span className="block text-[13px] text-muted">
          {[formatTime(exam.start_time), exam.title, exam.grade != null ? `Nota ${exam.grade}` : null].filter(Boolean).join(" · ")}
        </span>
        {subtitle && <span className="block text-[13px] text-muted">{subtitle}</span>}
        <span className="mt-1 flex gap-4">
          <FormSheet title="Editar examen" trigger={{ label: "Editar" }} action={saveExam.bind(null, exam.id)}>
            <ExamFields subjects={subjects} exam={exam} subjectId={fixedSubject ? exam.subject_id : undefined} />
          </FormSheet>
          <ActionButton action={deleteRow.bind(null, "exams", exam.id)} confirm="¿Borrar este examen?" className="min-h-8 text-[13px] font-semibold text-muted">
            Borrar
          </ActionButton>
        </span>
      </span>
      {days !== null && days >= 0 && <Chip tone={days <= 14 ? "acc" : "mut"}>{countdown(days)}</Chip>}
    </div>
  );
}

export function AddExamSheet({ subjects, subjectId }: { subjects: Pick<Subject, "id" | "name">[]; subjectId?: string }) {
  return (
    <FormSheet title="Nuevo examen" trigger={{ label: "Añadir" }} action={saveExam.bind(null, null)}>
      <ExamFields subjects={subjects} subjectId={subjectId} />
    </FormSheet>
  );
}
