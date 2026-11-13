import { Suspense } from "react";
import { Columns, EmptyState, Section, Skeleton } from "@/components/ui/primitives";
import { startAdvice } from "@/features/estudios/logic";
import { AddExamSheet, ExamCalendar, ExamRow } from "@/features/estudios/components/exams";
import { getExamsView } from "@/features/estudios/queries";

export const metadata = { title: "Exámenes" };

type SearchParams = Promise<{ mes?: string }>;

export default function ExamenesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Exams searchParams={searchParams} />
    </Suspense>
  );
}

async function Exams({ searchParams }: { searchParams: SearchParams }) {
  const { mes } = await searchParams;
  const { today, month, examDays, studyDays, subjects, upcoming } = await getExamsView(mes);

  return (
    <>
      <Columns>
      <div>
      <Section>
        <ExamCalendar month={month} today={today} examDays={examDays} studyDays={studyDays} />
      </Section>

      </div>
      <div>
      <Section title="Próximos exámenes" aside={subjects.length > 0 && <AddExamSheet subjects={subjects} />}>
        {upcoming.length ? (
          <div className="divide-y divide-line">
            {upcoming.map((exam) => (
              <ExamRow
                key={exam.id}
                exam={exam}
                days={exam.days}
                title={exam.subjectName}
                subtitle={startAdvice(today, exam.exam_date, exam.masteries)}
                subjects={subjects}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon="calendar" title="Sin exámenes a la vista">
            {subjects.length
              ? "Añade tus exámenes y te diré cuándo empezar a estudiar cada uno según lo que te falte por dominar."
              : "Primero crea tus asignaturas en la pestaña Asignaturas."}
          </EmptyState>
        )}
      </Section>
      </div>
      </Columns>
    </>
  );
}
