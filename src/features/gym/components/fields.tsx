// Campos compartidos del módulo de gym.
import { ChoicePills, Field, FieldRow, Input } from "@/components/ui/field";
import { PHOTO_ANGLES, WEEKDAYS, toOptions } from "@/lib/constants";
import type { Exercise, Routine } from "@/lib/types";

const weekdayOptions = WEEKDAYS.map((label, i) => ({ value: String(i), label: label.slice(0, 3) }));

export function RoutineFields({ routine }: { routine?: Routine }) {
  return (
    <>
      <Field label="Nombre">
        <Input name="name" required defaultValue={routine?.name} placeholder="Empuje" />
      </Field>
      <ChoicePills label="Días" name="weekdays" multiple options={weekdayOptions} defaultValues={routine?.weekdays.map(String)} />
      <Field label="Notas">
        <Input name="notes" defaultValue={routine?.notes ?? ""} placeholder="Pecho, hombro y tríceps" />
      </Field>
    </>
  );
}

/** Ejercicio de una rutina. El nombre sugiere los que ya existen (o crea uno nuevo). */
export function RoutineExerciseFields({ exercises }: { exercises: Exercise[] }) {
  return (
    <>
      <Field label="Ejercicio">
        <Input name="name" required list="exercise-names" placeholder="Press banca" autoComplete="off" />
        <datalist id="exercise-names">
          {exercises.map((e) => (
            <option key={e.id} value={e.name} />
          ))}
        </datalist>
      </Field>
      <FieldRow>
        <Field label="Series">
          <Input name="sets" type="number" inputMode="numeric" min={1} max={20} defaultValue={3} />
        </Field>
        <Field label="Repeticiones" hint="«6-8», «10» o «fallo»">
          <Input name="reps" defaultValue="8" />
        </Field>
      </FieldRow>
      <Field label="Descanso (segundos)">
        <Input name="rest_s" type="number" inputMode="numeric" min={0} max={900} placeholder="90" />
      </Field>
    </>
  );
}

export function BodyFields({ today }: { today: string }) {
  return (
    <>
      <FieldRow>
        <Field label="Día">
          <Input name="day" type="date" defaultValue={today} required />
        </Field>
        <Field label="Peso (kg)">
          <Input name="weight_kg" type="number" inputMode="decimal" step="0.1" min={20} max={300} />
        </Field>
      </FieldRow>
      <FieldRow>
        <Field label="Pecho (cm)">
          <Input name="chest_cm" type="number" inputMode="decimal" step="0.5" />
        </Field>
        <Field label="Cintura (cm)">
          <Input name="waist_cm" type="number" inputMode="decimal" step="0.5" />
        </Field>
      </FieldRow>
      <Field label="Brazo (cm)">
        <Input name="arm_cm" type="number" inputMode="decimal" step="0.5" />
      </Field>
    </>
  );
}

export function PhotoFields({ today }: { today: string }) {
  return (
    <>
      <ChoicePills label="Ángulo" name="angle" options={toOptions(PHOTO_ANGLES)} defaultValue="frente" />
      <Field label="Día">
        <Input name="day" type="date" defaultValue={today} required />
      </Field>
    </>
  );
}
