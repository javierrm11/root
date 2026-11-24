import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MonthCalendar, type DayMark } from "@/components/ui/month-calendar";
import { Chip, Dot, EmptyState, LinkPills, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { CALENDAR_AREAS, keysOf, type Tone } from "@/lib/constants";
import { capitalize, formatLongDay } from "@/lib/dates";
import { byDay, getCalendarMonth } from "@/features/calendario/queries";

export const metadata = { title: "Calendario" };

type SearchParams = Promise<{ mes?: string; dia?: string; area?: string }>;

export default function CalendarioPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader eyebrow="Exámenes, plan, contenido, gym y proyectos" title="Calendario" actions={<ThemeToggle />} />
      <Suspense fallback={<Skeleton lines={8} />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const { mes, dia, area } = await searchParams;
  return <CalendarView mes={mes} dia={dia} area={area} />;
}

async function CalendarView({ mes, dia, area }: { mes?: string; dia?: string; area?: string }) {
  "use cache: private";
  cacheLife("pantalla");
  const cal = await getCalendarMonth(mes, dia, area);
  const tone = (a: keyof typeof CALENDAR_AREAS) => CALENDAR_AREAS[a].tone as Tone;

  const marks = new Map<string, DayMark>();
  for (const [day, items] of byDay(cal.items)) {
    marks.set(day, {
      dots: [...new Set(items.map((i) => tone(i.area)))],
      filled: items.some((i) => i.type === "examen"),
    });
  }
  const query = { mes: cal.month.slice(0, 7), ...(cal.area && { area: cal.area }) };
  const href = (params: Record<string, string>) => `?${new URLSearchParams({ ...query, ...params })}`;

  return (
    <>
      <LinkPills
        items={[
          { href: `?${new URLSearchParams({ mes: query.mes, dia: cal.selected })}`, label: "Todo", active: !cal.area },
          ...keysOf(CALENDAR_AREAS).map((a) => ({
            href: `?${new URLSearchParams({ mes: query.mes, dia: cal.selected, area: a })}`,
            label: CALENDAR_AREAS[a].label,
            active: cal.area === a,
            count: cal.counts[a],
          })),
        ]}
      />
      <Section>
        <MonthCalendar
          month={cal.month}
          today={cal.today}
          marks={marks}
          selected={cal.selected}
          dayHref={(iso) => href({ dia: iso })}
          query={{ ...(cal.area && { area: cal.area }) }}
          legend={[
            ...keysOf(CALENDAR_AREAS).map((a) => ({ label: CALENDAR_AREAS[a].label, tone: tone(a) })),
            { label: "Examen", filled: true },
          ]}
        />
      </Section>

      <Section title={`${cal.selected === cal.today ? "Hoy, " : ""}${cal.selected === cal.today ? formatLongDay(cal.selected) : capitalize(formatLongDay(cal.selected))}`}>
        {cal.dayItems.length ? (
          <RowList>
            {cal.dayItems.map((item) => (
              <Row
                key={`${item.type}-${item.id}-${item.title}`}
                href={item.href}
                leading={<Dot tone={tone(item.area)} />}
                title={item.title}
                subtitle={item.subtitle}
                trailing={item.done ? <Chip tone="gym">Hecho</Chip> : item.important ? <Chip tone={tone(item.area)}>Importante</Chip> : undefined}
              />
            ))}
          </RowList>
        ) : (
          <EmptyState icon="calendar" title="Día libre">
            Nada previsto. Pídele a Claude que te reparta el plan o añade algo con el botón +.
          </EmptyState>
        )}
      </Section>
    </>
  );
}
