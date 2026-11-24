import Link from "next/link";
import { ActionButton } from "@/components/ui/action-button";
import { Field, Input, Select, ChoicePills, Textarea } from "@/components/ui/field";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { STUDY_TASK_KINDS, toOptions } from "@/lib/constants";
import { addStudyTask, toggleStudyTask } from "../actions";
import type { PlanTask } from "../queries";

/** Tarea del plan: check para marcarla y flecha para ir a su asignatura o tipo de ejercicio. */
export function StudyTaskRow({ task, showDay }: { task: PlanTask; showDay?: string }) {
  const kind = STUDY_TASK_KINDS[task.kind];
  return (
    <div className="flex min-h-14 items-center gap-1">
      <ActionButton
        action={toggleStudyTask.bind(null, task.id, !task.done)}
        pressed={task.done}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
      >
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-lg border-2",
            task.done ? "border-accent bg-accent text-ink" : "border-line text-transparent",
          )}
        >
          <Icon name="check" size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] leading-snug font-bold", task.done && "text-muted line-through")}>{task.title}</span>
          <span className={cn("block text-xs font-bold", `tone-${kind.tone}`, "text-[var(--c)]")}>
            {[showDay, kind.label, task.subjectName].filter(Boolean).join(" · ")}
          </span>
        </span>
      </ActionButton>
      <Link href={task.href} aria-label={`Abrir ${task.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted">
        <Icon name="chevron-right" size={18} />
      </Link>
    </div>
  );
}

/** Añadir una tarea al plan a mano. */
export function AddStudyTaskSheet({ today, subjects }: { today: string; subjects: Array<{ id: string; name: string }> }) {
  return (
    <FormSheet title="Nueva tarea del plan" trigger={{ label: "Añadir", icon: "plus", variant: "small" }} action={addStudyTask}>
      <Field label="Qué hay que hacer">
        <Input name="title" required placeholder="Ejercicios 7, 9 y 15(b) del gradiente" />
      </Field>
      <Field label="Día">
        <Input name="day" type="date" required defaultValue={today} />
      </Field>
      <Field label="Asignatura">
        <Select name="subject_id" placeholder="Sin asignatura" options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
      </Field>
      <ChoicePills label="Tipo" name="kind" options={toOptions(STUDY_TASK_KINDS)} defaultValue="estudiar" />
      <Field label="Notas (opcional)">
        <Textarea name="notes" />
      </Field>
    </FormSheet>
  );
}
