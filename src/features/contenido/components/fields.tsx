// Campos compartidos entre "crear" y "editar" del módulo de contenido.
import { ChoicePills, Field, FieldRow, Input, Select, Textarea } from "@/components/ui/field";
import { VIDEO_FORMATS, VIDEO_STAGES, WEEKDAYS, toOptions } from "@/lib/constants";
import type { ContentIdea, Video } from "@/lib/types";

const formatOptions = toOptions(VIDEO_FORMATS);

export function ContentIdeaFields({ idea }: { idea?: ContentIdea }) {
  return (
    <>
      <Field label="La idea">
        <Input name="title" required defaultValue={idea?.title} placeholder="Recursividad explicada con muñecas rusas" />
      </Field>
      <Field label="Gancho (primeros 3 segundos)">
        <Input name="hook" defaultValue={idea?.hook ?? ""} placeholder="Si entiendes esto, entiendes la recursividad." />
      </Field>
      <Field label="Formato">
        <Select name="format" defaultValue={idea?.format ?? "tutorial"} options={formatOptions} />
      </Field>
      <Field label="Hashtags">
        <Input name="hashtags" defaultValue={idea?.hashtags ?? ""} placeholder="#programacion #ia" />
      </Field>
      <Field label="Notas">
        <Textarea name="notes" defaultValue={idea?.notes ?? ""} className="min-h-20" />
      </Field>
    </>
  );
}

export function VideoFields({ video }: { video?: Video }) {
  return (
    <>
      <Field label="Título">
        <Input name="title" required defaultValue={video?.title} placeholder="3 atajos de VS Code que no conocías" />
      </Field>
      <FieldRow>
        <Field label="Formato">
          <Select name="format" defaultValue={video?.format ?? "tutorial"} options={formatOptions} />
        </Field>
        <Field label="Serie">
          <Input name="series" defaultValue={video?.series ?? ""} placeholder="IA para programar" />
        </Field>
      </FieldRow>
      <ChoicePills label="Fase" name="stage" options={toOptions(VIDEO_STAGES)} defaultValue={video?.stage ?? "guion"} />
      <FieldRow>
        <Field label="Grabar">
          <Input name="record_date" type="date" defaultValue={video?.record_date ?? ""} />
        </Field>
        <Field label="Editar">
          <Input name="edit_date" type="date" defaultValue={video?.edit_date ?? ""} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Publicar">
          <Input name="publish_date" type="date" defaultValue={video?.publish_date ?? ""} />
        </Field>
        <Field label="Hora">
          <Input name="publish_time" type="time" defaultValue={video?.publish_time?.slice(0, 5) ?? ""} />
        </Field>
      </FieldRow>
      <Field label="Gancho · 0–3 s">
        <Textarea name="hook" defaultValue={video?.hook ?? ""} className="min-h-16" />
      </Field>
      <Field label="Desarrollo">
        <Textarea name="body" defaultValue={video?.body ?? ""} />
      </Field>
      <Field label="Llamada a la acción">
        <Input name="cta" defaultValue={video?.cta ?? ""} placeholder="Sígueme para la parte 2" />
      </Field>
      <FieldRow>
        <Field label="Duración (s)">
          <Input name="duration_s" type="number" inputMode="numeric" min={1} max={600} defaultValue={video?.duration_s ?? ""} />
        </Field>
        <Field label="Sonido">
          <Input name="sound" defaultValue={video?.sound ?? ""} placeholder="Audio original" />
        </Field>
      </FieldRow>
      <Field label="Hashtags">
        <Input name="hashtags" defaultValue={video?.hashtags ?? ""} placeholder="#programacion #ia" />
      </Field>
      <Field label="Notas de grabación">
        <Textarea name="notes" defaultValue={video?.notes ?? ""} className="min-h-16" />
      </Field>
    </>
  );
}

export function WindowFields() {
  return (
    <>
      <Field label="Día">
        <Select name="weekday" defaultValue="1" options={WEEKDAYS.map((label, i) => ({ value: String(i), label }))} />
      </Field>
      <FieldRow>
        <Field label="Desde">
          <Input name="start_time" type="time" required defaultValue="19:00" />
        </Field>
        <Field label="Hasta">
          <Input name="end_time" type="time" required defaultValue="21:00" />
        </Field>
      </FieldRow>
      <Field label="Nota">
        <Input name="note" placeholder="Más visitas después de clase" />
      </Field>
    </>
  );
}
