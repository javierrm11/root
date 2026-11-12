import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { EXAM_KINDS } from "@/lib/constants";
import { addMonths, countdown, formatMonth, formatShortMonth, formatTime, weekdayMonday } from "@/lib/dates";
import type { Exam, Subject } from "@/lib/types";
import { deleteRow } from "@/features/common/actions";
import { saveExam } from "../actions";
import { ExamFields } from "./fields";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/** Calendario mensual con exámenes (acento) y días con estudio en la agenda (punto). */
export function ExamCalendar({
  month,
  today,
  days,
  examDays,
  studyDays,
}: {
  month: string;
  today: string;
  days: number;
  examDays: Set<string>;
  studyDays: Set<string>;
}) {
  const blanks = weekdayMonday(month);
  const iso = (d: number) => `${month.slice(0, 8)}${String(d).padStart(2, "0")}`;
  const monthParam = (offset: number) => `?mes=${addMonths(month, offset).slice(0, 7)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{formatMonth(month)}</h2>
        <div className="flex gap-1.5">
          <Link href={monthParam(-1)} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-xl border border-line">
            <Icon name="chevron-left" size={16} />
          </Link>
          <Link href={monthParam(1)} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-xl border border-line">
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1 text-xs font-semibold text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(i + 1);
          const exam = examDays.has(date);
          return (
            <span
              key={date}
              className={cn(
                "relative grid h-[38px] place-items-center rounded-[10px] text-sm font-medium",
                date < today && "text-muted",
                date === today && "bg-fg font-bold text-bg",
                exam && "bg-accent font-bold text-ink",
              )}
            >
              {i + 1}
              {studyDays.has(date) && !exam && <span className="absolute bottom-1 size-1 rounded-full bg-study" aria-hidden />}
            </span>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Examen
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-study" />
          Estudio en la agenda
        </span>
      </div>
    </div>
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
      <span className="flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2">
        <span className="text-lg leading-none font-bold">{Number(exam.exam_date.slice(8))}</span>
        <span className="mt-0.5 text-[11px] font-semibold text-muted uppercase">{formatShortMonth(exam.exam_date)}</span>
      </span>
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
