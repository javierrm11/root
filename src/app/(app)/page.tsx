import Link from "next/link";
import { Suspense } from "react";
import { MenuSheet } from "@/components/layout/menu-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { TodayLabel } from "@/components/layout/today-label";
import { CheckRow } from "@/components/ui/check-row";
import { Chip, EmptyState, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { EXAM_KINDS } from "@/lib/constants";
import { countdown } from "@/lib/dates";
import { toggleHabit } from "@/features/hoy/actions";
import { AddAgendaSheet, AgendaTimeline } from "@/features/hoy/components";
import { getToday } from "@/features/hoy/queries";

export default function HoyPage() {
  return (
    <>
      <PageHeader eyebrow={<TodayLabel />} title="Hoy" actions={<MenuSheet />} />
      <Suspense fallback={<Skeleton lines={6} />}>
        <Today />
      </Suspense>
    </>
  );
}

async function Today() {
  const { today, now, agenda, habits, streak, inboxCount, nextExam, priority } = await getToday();
  const habitsDone = habits.filter((h) => h.done).length;

  return (
    <>
      <StatRow>
        <Link href="/estudios/examenes">
          <Stat
            accent
            value={nextExam ? countdown(nextExam.days) : "—"}
            label={nextExam ? `${EXAM_KINDS[nextExam.kind].label} de ${nextExam.subjectName}` : "Sin exámenes"}
          />
        </Link>
        <Stat value={streak} label={streak === 1 ? "Día de racha" : "Días de racha"} />
        <Link href="/bandeja">
          <Stat value={inboxCount} label="En la bandeja" />
        </Link>
      </StatRow>

      {priority.length > 0 && (
        <Section title="Toca estudiar">
          <RowList>
            {priority.map((topic) => (
              <Link key={topic.id} href={`/estudios/asignatura/${topic.subject_id}`} className="block">
                <Row
                  title={topic.title}
                  subtitle={`${topic.subjectName} · dominio ${topic.mastery}/5`}
                  trailing={<Chip tone={topic.examDays <= 14 ? "acc" : "mut"}>{countdown(topic.examDays)}</Chip>}
                />
              </Link>
            ))}
          </RowList>
        </Section>
      )}

      <Section title="Agenda" aside={<AddAgendaSheet today={today} />}>
        {agenda.length ? (
          <AgendaTimeline items={agenda} now={now} />
        ) : (
          <p className="text-sm text-muted">Nada planificado para hoy. Añade bloques de estudio, grabación o gym.</p>
        )}
      </Section>

      <Section
        title="Hábitos"
        aside={
          <Link href="/habitos" className="text-[13px] font-semibold text-acc">
            {habits.length ? `${habitsDone} de ${habits.length}` : "Crear"}
          </Link>
        }
      >
        {habits.length ? (
          <RowList>
            {habits.map((habit) => (
              <CheckRow key={habit.id} done={habit.done} label={habit.name} action={toggleHabit.bind(null, habit.id, today, !habit.done)} />
            ))}
          </RowList>
        ) : (
          <EmptyState icon="flame" title="Sin hábitos todavía">
            Crea tus hábitos diarios en <Link href="/habitos" className="text-acc">Hábitos</Link> y márcalos aquí cada día.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
