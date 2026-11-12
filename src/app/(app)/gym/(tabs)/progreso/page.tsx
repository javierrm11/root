import { Suspense } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { Chip, EmptyState, LinkPills, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { formatKg, formatSet } from "@/features/gym/logic";
import { getProgress } from "@/features/gym/queries";

export const metadata = { title: "Progreso" };

type SearchParams = Promise<{ ej?: string }>;

export default function ProgresoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Progress searchParams={searchParams} />
    </Suspense>
  );
}

async function Progress({ searchParams }: { searchParams: SearchParams }) {
  const { ej } = await searchParams;
  const { exercises, selected, bars, record, estimated, gain, records } = await getProgress(ej);

  if (!selected) {
    return (
      <EmptyState icon="gym" title="Aún no hay progreso que mostrar">
        Marca series con peso en tus entrenos y aquí verás cómo subes semana a semana.
      </EmptyState>
    );
  }

  return (
    <>
      <LinkPills items={exercises.map((e) => ({ href: `?ej=${e.id}`, label: e.name, active: e.id === selected.id }))} />
      <StatRow>
        <Stat value={record ? formatKg(record) : "—"} label="Récord" accent />
        <Stat value={estimated ? formatKg(Math.round(estimated)) : "—"} label="1RM estimado" />
        <Stat value={gain !== null ? `${gain >= 0 ? "+" : ""}${formatKg(gain)}` : "—"} label="En 8 semanas" />
      </StatRow>

      <Section title={`${selected.name} · últimas 8 semanas`} aside={<span className="text-[13px] text-muted">Mejor peso</span>}>
        <BarChart caption={`${selected.name}: mejor peso por semana`} bars={bars.map((b) => ({ label: b.label, value: b.value, display: b.value ? formatKg(b.value) : "—" }))} />
      </Section>

      <Section title="Récords personales">
        <RowList>
          {records.map(({ exercise, best }) => (
            <Row key={exercise.id} title={exercise.name} subtitle={formatSet(best.set)} trailing={<Chip tone="gym">{formatKg(Math.round(best.max))} 1RM</Chip>} />
          ))}
        </RowList>
      </Section>
    </>
  );
}
