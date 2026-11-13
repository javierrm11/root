import { ActionButton } from "@/components/ui/action-button";
import { ChoicePills, Field, FieldRow, Input, Textarea } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { TimelineItem } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { AGENDA_CATEGORIES, INBOX_KINDS, toOptions } from "@/lib/constants";
import { formatTime } from "@/lib/dates";
import type { AgendaItem } from "@/lib/types";
import { deleteRow, setFlag } from "@/features/common/actions";
import { createAgendaItem, createInboxItem } from "./actions";

/** Formulario para añadir un bloque a la agenda. */
export function AddAgendaSheet({ today }: { today: string }) {
  return (
    <FormSheet title="Nuevo bloque" trigger={{ label: "Añadir" }} action={createAgendaItem}>
      <Field label="Qué vas a hacer">
        <Input name="title" required placeholder="Programación · T4 Funciones" />
      </Field>
      <Field label="Día">
        <Input name="day" type="date" defaultValue={today} required />
      </Field>
      <FieldRow>
        <Field label="Empieza">
          <Input name="start_time" type="time" />
        </Field>
        <Field label="Termina">
          <Input name="end_time" type="time" />
        </Field>
      </FieldRow>
      <ChoicePills label="Categoría" name="category" options={toOptions(AGENDA_CATEGORIES)} defaultValue="estudio" />
      <Field label="Notas">
        <Input name="notes" placeholder="Opcional" />
      </Field>
    </FormSheet>
  );
}

/** Agenda del día en formato timeline. Tocar un bloque lo marca como hecho. */
export function AgendaTimeline({ items, now }: { items: AgendaItem[]; now: string }) {
  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const start = formatTime(item.start_time);
        const end = formatTime(item.end_time);
        const isNow = Boolean(start && end && start <= now && now < end && !item.done);
        const category = AGENDA_CATEGORIES[item.category];
        return (
          <TimelineItem
            key={item.id}
            time={start || "—"}
            until={end}
            tone={category.tone}
            now={isNow}
            trailing={
              <ActionButton
                action={deleteRow.bind(null, "agenda_items", item.id)}
                confirm="¿Quitar este bloque de la agenda?"
                label="Quitar bloque"
                className="grid size-8 place-items-center text-muted"
              >
                <Icon name="x" size={15} />
              </ActionButton>
            }
          >
            <ActionButton action={setFlag.bind(null, "agenda_items", item.id, !item.done)} pressed={item.done} className="w-full text-left">
              <span className={cn("block text-sm font-semibold", isNow && "text-acc", item.done && "text-muted line-through")}>{item.title}</span>
              <span className="block text-[13px] text-muted">{[category.label, item.notes].filter(Boolean).join(" · ")}</span>
            </ActionButton>
          </TimelineItem>
        );
      })}
    </div>
  );
}

/**
 * Captura rápida, presente en toda la app: botón "+" flotante en el móvil
 * (placement="fab") o botón al pie del menú lateral en tablet y ordenador (placement="side").
 */
export function QuickCapture({ placement }: { placement: "fab" | "side" }) {
  const sheet = (
    <FormSheet title="Captura rápida" trigger={{ label: "Captura rápida", icon: "plus", variant: placement }} action={createInboxItem}>
      <Field label="Qué quieres apuntar">
        <Textarea name="content" required placeholder="Idea, tarea, nota… lo que tengas en la cabeza" className="min-h-28" />
      </Field>
      <ChoicePills label="Tipo" name="kind" options={toOptions(INBOX_KINDS)} defaultValue="tarea" />
      <p className="text-[13px] text-muted">Va a la bandeja de entrada y lo clasificas cuando quieras.</p>
    </FormSheet>
  );
  if (placement === "side") return sheet;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-30 mx-auto flex max-w-[480px] justify-end px-5 md:hidden">
      {sheet}
    </div>
  );
}
