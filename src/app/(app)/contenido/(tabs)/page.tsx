import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { MonthCalendar } from "@/components/ui/month-calendar";
import { Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { VIDEO_TASKS, WEEKDAYS } from "@/lib/constants";
import { capitalize, formatLongDay, formatTime } from "@/lib/dates";
import { deleteRow } from "@/features/common/actions";
import { saveWindow } from "@/features/contenido/actions";
import { WindowFields } from "@/features/contenido/components/fields";
import { TaskRow } from "@/features/contenido/components/task-row";
import { getContentCalendar } from "@/features/contenido/queries";

export const metadata = { title: "Contenido" };

type SearchParams = Promise<{ mes?: string; dia?: string }>;

export default function CalendarioPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  const { mes, dia } = await searchParams;
  const { today, month, selected, marks, dayTasks, selectedIsWindow, windows } = await getContentCalendar(mes, dia);

  return (
    <>
      <Section>
        <MonthCalendar
          month={month}
          today={today}
          marks={marks}
          selected={selected}
          dayHref={(iso) => `?mes=${iso.slice(0, 7)}&dia=${iso}`}
          legend={[
            ...VIDEO_TASKS.map((t) => ({ label: t.label, tone: t.tone })),
            { label: "Ventana recomendada", ring: true },
          ]}
        />
      </Section>

      <Section
        title={capitalize(formatLongDay(selected))}
        aside={selectedIsWindow && <span className="text-[13px] font-semibold text-acc">Ventana recomendada</span>}
      >
        {dayTasks.length ? (
          <RowList>
            {dayTasks.map((item) => (
              <TaskRow key={`${item.video.id}-${item.task.key}`} item={item} />
            ))}
          </RowList>
        ) : (
          <p className="text-sm text-muted">Nada planificado este día.</p>
        )}
      </Section>

      <Section
        title="Ventanas recomendadas"
        aside={
          <FormSheet title="Nueva ventana" trigger={{ label: "Añadir" }} action={saveWindow}>
            <WindowFields />
          </FormSheet>
        }
      >
        {windows.length ? (
          <RowList>
            {windows.map((w) => (
              <Row
                key={w.id}
                title={WEEKDAYS[w.weekday]}
                subtitle={w.note ?? undefined}
                trailing={
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold text-acc">
                      {formatTime(w.start_time)}–{formatTime(w.end_time)}
                    </span>
                    <ActionButton action={deleteRow.bind(null, "publish_windows", w.id)} label="Quitar ventana" className="grid size-8 place-items-center text-muted">
                      <Icon name="x" size={15} />
                    </ActionButton>
                  </span>
                }
              />
            ))}
          </RowList>
        ) : (
          <p className="text-sm text-muted">Las mejores horas para publicar te las sugerirá Claude (fase 5). Mientras, puedes añadirlas a mano.</p>
        )}
      </Section>
    </>
  );
}
