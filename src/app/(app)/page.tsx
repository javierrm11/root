import Link from "next/link";
import { Suspense } from "react";
import { MenuSheet } from "@/components/layout/menu-sheet";
import { PageHeader } from "@/components/layout/page-header";
import { TodayLabel } from "@/components/layout/today-label";
import { CheckRow } from "@/components/ui/check-row";
import { Chip, Dot, EmptyState, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { EXAM_KINDS, INVOICE_STATUS } from "@/lib/constants";
import { countdown, formatDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { toggleHabit } from "@/features/hoy/actions";
import { AddAgendaSheet, AgendaTimeline } from "@/features/hoy/components";
import { getToday } from "@/features/hoy/queries";
import { TaskRow } from "@/features/contenido/components/task-row";
import { GoalProgress } from "@/features/objetivos/components";

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
  const { today, now, agenda, habits, streak, inboxCount, nextExam, priority, freelance, content, gym, goals } = await getToday();
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

      {(freelance.pending.length > 0 || freelance.inProgress.length > 0) && (
        <Section
          title="Freelance"
          aside={
            <Link href="/proyectos" className="text-[13px] font-semibold text-acc">
              Ver
            </Link>
          }
        >
          <RowList>
            {freelance.pending.map((invoice) => (
              <Link key={invoice.id} href="/proyectos/finanzas" className="block">
                <Row
                  leading={<Dot tone={INVOICE_STATUS[invoice.status].tone} />}
                  title={`${INVOICE_STATUS[invoice.status].label} · ${invoice.clientName}`}
                  subtitle={[invoice.number, invoice.due_date && `vence ${formatDay(invoice.due_date)}`].filter(Boolean).join(" · ")}
                  trailing={<span className="font-mono text-sm font-semibold">{formatMoney(invoice.amount)}</span>}
                />
              </Link>
            ))}
            {freelance.inProgress.map((project) => (
              <Link key={project.id} href={`/proyectos/proyecto/${project.id}`} className="block">
                <Row
                  leading={<Dot tone="acc" />}
                  title={project.name}
                  subtitle={`En curso: ${project.doing.join(", ")}`}
                  trailing={<span className="font-mono text-sm font-semibold">{project.done}/{project.total}</span>}
                />
              </Link>
            ))}
          </RowList>
        </Section>
      )}

      {(content.today.length > 0 || content.tomorrow.length > 0) && (
        <Section
          title="Contenido"
          aside={
            <Link href="/contenido" className="text-[13px] font-semibold text-acc">
              Ver
            </Link>
          }
        >
          <RowList>
            {content.today.map((item) => (
              <TaskRow key={`${item.video.id}-${item.task.key}`} item={item} prefix="Hoy" />
            ))}
            {content.tomorrow.map((item) => (
              <TaskRow key={`${item.video.id}-${item.task.key}`} item={item} prefix="Mañana" />
            ))}
          </RowList>
        </Section>
      )}

      {(gym.active || gym.routines.length > 0) && (
        <Section title="Gym">
          <Link href={gym.active ? `/gym/entreno/${gym.active.id}` : "/gym"} className="block">
            <Row
              leading={<Dot tone="gym" />}
              title={gym.active ? "Entreno en curso" : `Toca ${gym.routines.map((r) => r.name).join(" y ")}`}
              subtitle={gym.active ? "Sigue donde lo dejaste" : `${gym.routines.reduce((n, r) => n + r.items.length, 0)} ejercicios`}
              trailing={<Chip tone="gym">{gym.active ? "Seguir" : "Empezar"}</Chip>}
            />
          </Link>
        </Section>
      )}

      {goals.length > 0 && (
        <Section
          title="Objetivos del trimestre"
          aside={
            <Link href="/objetivos" className="text-[13px] font-semibold text-acc">
              Ver
            </Link>
          }
        >
          <div className="divide-y divide-line">
            {goals.map((goal) => (
              <GoalProgress key={goal.id} goal={goal} />
            ))}
          </div>
        </Section>
      )}

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
