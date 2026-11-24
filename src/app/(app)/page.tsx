import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { MenuSheet } from "@/components/layout/menu-sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Brote, type BroteMood } from "@/components/ui/brote";
import { CheckRow } from "@/components/ui/check-row";
import { Icon, type IconName } from "@/components/ui/icon";
import { Chip, Columns, Dot, EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { CALENDAR_AREAS, EXAM_KINDS, INVOICE_STATUS, type Tone } from "@/lib/constants";
import { capitalize, formatDay, formatLongDay } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { toggleHabit } from "@/features/hoy/actions";
import { AddAgendaSheet, AgendaTimeline } from "@/features/hoy/components";
import { getToday } from "@/features/hoy/queries";
import { TaskRow } from "@/features/contenido/components/task-row";
import { StudyTaskRow } from "@/features/estudios/components/plan";
import { GoalProgress } from "@/features/objetivos/components";

const WEEK_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export default function HoyPage() {
  return (
    <Suspense fallback={<Skeleton lines={8} />}>
      <Today />
    </Suspense>
  );
}

/** Mini widget del Inicio: icono con su color, cifra o título y etiqueta. */
function Widget({ href, tone, icon, value, label, big }: { href: string; tone: Tone; icon: IconName; value: ReactNode; label: string; big?: boolean }) {
  return (
    <Link href={href} className="flex flex-col gap-2 rounded-[22px] bg-surface p-3.5 shadow-[var(--shadow)]">
      <span className={cn("tinted grid size-9 place-items-center rounded-xl", `tone-${tone}`)}>
        <Icon name={icon} size={19} />
      </span>
      <span className={cn("leading-tight font-extrabold tracking-[-0.02em]", big ? "text-[26px]" : "line-clamp-2 text-[17px]")}>{value}</span>
      <span className="text-[13px] font-semibold text-muted">{label}</span>
    </Link>
  );
}

async function Today() {
  "use cache: private";
  cacheLife("pantalla");
  const { today, now, agenda, habits, streak, nextExam, priority, freelance, content, gym, goals, plan, unread, week } = await getToday();
  const habitsDone = habits.filter((h) => h.done).length;
  const pending = plan.tasks.filter((t) => !t.done);
  const hour = Number(now.slice(0, 2));
  const greeting = hour < 13 ? "¡Buenos días!" : hour < 21 ? "¡Buenas tardes!" : "¡Buenas noches!";

  // Lo que dice Brote: lo siguiente que toca, o cómo vas.
  let mood: BroteMood = "feliz";
  let message: ReactNode = "Día tranquilo. Aprovecha para adelantar algo o descansar.";
  if (pending.length) {
    message = (
      <>
        Hoy toca <strong className="font-extrabold">{pending[0].title}</strong>
        {pending.length > 1 && ` y ${pending.length - 1} ${pending.length === 2 ? "tarea más" : "tareas más"}`}.
      </>
    );
  } else if (plan.tasks.length) {
    mood = "celebra";
    message = <>¡Plan de hoy completado! {streak > 0 && `Llevas ${streak} ${streak === 1 ? "día" : "días"} de racha.`}</>;
  } else if (plan.overdue) {
    mood = "piensa";
    message = (
      <>
        Tienes {plan.overdue} {plan.overdue === 1 ? "tarea atrasada" : "tareas atrasadas"}.{" "}
        <Link href="/estudios/plan" className="font-extrabold underline">Reorganízalas en Plan</Link>.
      </>
    );
  } else if (nextExam) {
    mood = "piensa";
    message = (
      <>
        Quedan <strong className="font-extrabold">{nextExam.days} días</strong> para {nextExam.subjectName}.{" "}
        <Link href="/estudios/plan" className="font-extrabold underline">Pide el plan a Claude</Link>.
      </>
    );
  }

  const contentNext = content.today[0] ?? content.tomorrow[0];

  return (
    <>
      <header className="mb-3.5 flex items-center gap-3">
        <MenuSheet>
          <Brote size={48} mood={mood} label="Abrir menú" />
        </MenuSheet>
        <span className="hidden md:block">
          <Brote size={48} mood={mood} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-muted">{capitalize(formatLongDay(today))}</p>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{greeting}</h1>
        </div>
        <ThemeToggle />
        <Link href="/avisos" aria-label={unread ? `Avisos, ${unread} sin leer` : "Avisos"} className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-surface shadow-[var(--shadow)]">
          <Icon name="bell" size={20} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-bg bg-[#d92d4b] px-1 text-[11px] font-extrabold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </header>

      <p className="mb-3.5 rounded-[20px] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-4 py-3.5 text-[15px] leading-snug font-medium">
        <strong className="font-extrabold">Brote dice:</strong> {message}
      </p>

      <section aria-label="Esta semana" className="mb-3.5 rounded-[22px] bg-surface p-3.5 shadow-[var(--shadow)]">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold">Esta semana</h2>
          <Link href="/calendario" className="flex min-h-8 items-center text-[13px] font-bold text-acc">
            Calendario
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {week.map(({ day, areas }, i) => (
            <Link key={day} href={`/calendario?dia=${day}`} className="flex flex-col items-center gap-1 py-0.5" aria-label={formatLongDay(day)}>
              <span className="text-[11px] font-bold text-muted">{WEEK_LETTERS[i]}</span>
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl text-[15px]",
                  day === today ? "bg-accent font-extrabold text-ink" : "font-bold",
                  day < today && "text-muted",
                )}
              >
                {Number(day.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {areas.slice(0, 3).map((a) => (
                  <span key={a} className={cn("size-1.5 rounded-full bg-[var(--c)]", `tone-${CALENDAR_AREAS[a].tone}`)} />
                ))}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {nextExam ? (
          <Link href="/estudios/plan" className="col-span-2 flex items-center gap-4 rounded-[22px] bg-accent p-4 text-ink">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold tracking-wide uppercase opacity-85">Próximo examen</span>
              <span className="mt-1 block truncate text-xl font-extrabold">
                {nextExam.subjectName} · {EXAM_KINDS[nextExam.kind].label}
              </span>
              <span className="block text-[13px] font-semibold opacity-85">{capitalize(formatLongDay(nextExam.exam_date))}</span>
              <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_22%,transparent)]">
                <span className="block h-full rounded-full bg-[var(--ink)]" style={{ width: `${nextExam.pct}%` }} />
              </span>
              <span className="mt-1.5 block text-xs font-bold opacity-90">Dominio {nextExam.pct} %</span>
            </span>
            <span className="rounded-[18px] bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] px-3.5 py-2.5 text-center">
              <span className="block text-[40px] leading-none font-extrabold tracking-[-0.03em]">{nextExam.days}</span>
              <span className="block text-xs font-bold">{nextExam.days === 1 ? "día" : "días"}</span>
            </span>
          </Link>
        ) : (
          <Link href="/estudios/examenes" className="col-span-2 flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-[var(--shadow)]">
            <Icon name="calendar" size={20} className="text-acc" />
            <span className="flex-1 text-[15px] font-bold">Sin exámenes a la vista. Añade las fechas para la cuenta atrás.</span>
          </Link>
        )}
        <Widget href="/habitos" tone="work" icon="flame" value={`${streak} ${streak === 1 ? "día" : "días"}`} label="Racha" big />
        <Widget
          href={gym.active ? `/gym/entreno/${gym.active.id}` : "/gym"}
          tone="gym"
          icon="gym"
          value={gym.active ? "Entreno en curso" : gym.routines.length ? gym.routines.map((r) => r.name).join(" y ") : "Descanso"}
          label={gym.active ? "Sigue donde lo dejaste" : gym.routines.length ? `${gym.routines.reduce((n, r) => n + r.items.length, 0)} ejercicios` : "Sin rutina hoy"}
        />
        <Widget
          href={contentNext ? `/contenido/video/${contentNext.video.id}` : "/contenido"}
          tone="content"
          icon="video"
          value={contentNext ? `${contentNext.task.label} «${contentNext.video.title}»` : "Nada que grabar"}
          label={contentNext ? (content.today[0] ? "Contenido de hoy" : "Contenido de mañana") : "Contenido"}
        />
        <Widget href="/habitos" tone="study" icon="list" value={habits.length ? `${habitsDone}/${habits.length}` : "—"} label="Hábitos de hoy" big />
      </div>

      <Columns>
        <div>
          <Section
            title="Tu plan de hoy"
            aside={
              <Link href="/estudios/plan" className="text-[13px] font-bold text-acc">
                {plan.tasks.length ? `${plan.tasks.length - pending.length} de ${plan.tasks.length}` : "Plan"}
              </Link>
            }
          >
            {plan.tasks.length ? (
              <div className="divide-y divide-line">
                {plan.tasks.map((task) => (
                  <StudyTaskRow key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No hay tareas del plan para hoy.{" "}
                <Link href="/estudios/plan" className="font-bold text-acc">
                  Pide a Claude tu plan de exámenes
                </Link>
                .
              </p>
            )}
            {plan.overdue > 0 && (
              <Link href="/estudios/plan" className="mt-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] font-bold">
                <Icon name="repeat" size={15} className="text-acc" />
                {plan.overdue} {plan.overdue === 1 ? "tarea atrasada" : "tareas atrasadas"}: reorganizar
              </Link>
            )}
          </Section>

          {!plan.tasks.length && priority.length > 0 && (
            <Section title="Toca estudiar">
              <RowList>
                {priority.map((topic) => (
                  <Row
                    key={topic.id}
                    href={`/estudios/asignatura/${topic.subject_id}`}
                    title={topic.title}
                    subtitle={`${topic.subjectName} · dominio ${topic.mastery}/5`}
                    trailing={<Chip tone={topic.examDays <= 14 ? "acc" : "mut"}>{topic.examDays} d</Chip>}
                  />
                ))}
              </RowList>
            </Section>
          )}

          <Section title="Agenda" aside={<AddAgendaSheet today={today} />}>
            {agenda.length ? (
              <AgendaTimeline items={agenda} now={now} />
            ) : (
              <p className="text-sm text-muted">Nada con hora para hoy. Añade bloques de estudio, grabación o gym.</p>
            )}
          </Section>

          {(content.today.length > 0 || content.tomorrow.length > 0) && (
            <Section
              title="Contenido"
              aside={
                <Link href="/contenido" className="text-[13px] font-bold text-acc">
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
        </div>

        <div>
          <Section
            title="Hábitos"
            aside={
              <Link href="/habitos" className="text-[13px] font-bold text-acc">
                {habits.length ? `${habitsDone} de ${habits.length}` : "Crear"}
              </Link>
            }
          >
            {habits.length ? (
              <div className="divide-y divide-line">
                {habits.map((habit) => (
                  <CheckRow key={habit.id} square done={habit.done} label={habit.name} action={toggleHabit.bind(null, habit.id, today, !habit.done)} />
                ))}
              </div>
            ) : (
              <EmptyState icon="flame" title="Sin hábitos todavía">
                Crea tus hábitos diarios en <Link href="/habitos" className="text-acc">Hábitos</Link> y márcalos aquí cada día.
              </EmptyState>
            )}
          </Section>

          {(freelance.pending.length > 0 || freelance.inProgress.length > 0) && (
            <Section
              title="Freelance"
              aside={
                <Link href="/proyectos" className="text-[13px] font-bold text-acc">
                  Ver
                </Link>
              }
            >
              <RowList>
                {freelance.pending.map((invoice) => (
                  <Row
                    key={invoice.id}
                    href="/proyectos/finanzas"
                    leading={<Dot tone={INVOICE_STATUS[invoice.status].tone} />}
                    title={`${INVOICE_STATUS[invoice.status].label} · ${invoice.clientName}`}
                    subtitle={[invoice.number, invoice.due_date && `vence ${formatDay(invoice.due_date)}`].filter(Boolean).join(" · ")}
                    trailing={<span className="text-sm font-bold">{formatMoney(invoice.amount)}</span>}
                  />
                ))}
                {freelance.inProgress.map((project) => (
                  <Row
                    key={project.id}
                    href={`/proyectos/proyecto/${project.id}`}
                    leading={<Dot tone="acc" />}
                    title={project.name}
                    subtitle={`En curso: ${project.doing.join(", ")}`}
                    trailing={
                      <span className="text-sm font-bold">
                        {project.done}/{project.total}
                      </span>
                    }
                  />
                ))}
              </RowList>
            </Section>
          )}

          {goals.length > 0 && (
            <Section
              title="Objetivos del trimestre"
              aside={
                <Link href="/objetivos" className="text-[13px] font-bold text-acc">
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
        </div>
      </Columns>
    </>
  );
}
