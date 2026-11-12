import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Icon } from "@/components/ui/icon";
import { Chip, Dot, EmptyState, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { aiConfigured } from "@/lib/ai";
import { AGENDA_CATEGORIES } from "@/lib/constants";
import { formatDay, formatShortDay } from "@/lib/dates";
import { formatHours } from "@/lib/format";
import { addPlanItem, generateReview } from "@/features/revision/actions";
import { getWeekReview } from "@/features/revision/queries";
import { getSettings } from "@/features/ajustes/queries";

export const metadata = { title: "Revisión semanal" };

export default function RevisionPage() {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Review />
    </Suspense>
  );
}

async function Review() {
  const [{ start, end, stats, review }, settings] = await Promise.all([getWeekReview(), getSettings()]);
  const canGenerate = aiConfigured() && settings.ai.revision;
  const numbers = [
    { label: "Estudio en la agenda", value: formatHours(stats.estudio_h), tone: "study" as const },
    { label: "Entrenos terminados", value: String(stats.entrenos), tone: "gym" as const },
    { label: "Vídeos publicados", value: String(stats.videos), tone: "content" as const },
    { label: "Horas freelance", value: formatHours(stats.freelance_h), tone: "work" as const },
    { label: "Hábitos cumplidos", value: `${stats.habitos_pct} %`, tone: "acc" as const },
    { label: "Facturas sin cobrar", value: String(stats.facturas_pendientes), tone: "mut" as const },
  ];

  return (
    <>
      <PageHeader title="Revisión" eyebrow={`Semana del ${formatShortDay(start)} al ${formatShortDay(end)}`} back={{ href: "/", label: "Hoy" }} />

      {review?.summary ? (
        <Section title="Resumen de Gemini">
          <p className="text-[15px] leading-relaxed">{review.summary}</p>
        </Section>
      ) : (
        <Section>
          <EmptyState icon="sparkles" title="Haz tu revisión de la semana">
            {canGenerate
              ? "Gemini lee los números de la semana, tus exámenes, objetivos y pendientes, y te propone un plan para la siguiente."
              : "Añade GEMINI_API_KEY en .env y activa la revisión en Ajustes para generarla con IA."}
          </EmptyState>
        </Section>
      )}
      {canGenerate && (
        <ActionButton action={generateReview} className="mb-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-ink">
          <Icon name="sparkles" size={18} />
          {review ? "Volver a generar" : "Generar revisión"}
        </ActionButton>
      )}

      <Section title="La semana en números">
        <RowList>
          {numbers.map((n) => (
            <Row key={n.label} leading={<Dot tone={n.tone} />} title={n.label} trailing={<span className="font-mono text-sm font-semibold">{n.value}</span>} />
          ))}
        </RowList>
      </Section>

      {review && review.good.length > 0 && (
        <Section title="Lo que salió bien">
          <RowList>
            {review.good.map((text) => (
              <Row key={text} leading={<Dot tone="gym" />} title={<span className="font-medium">{text}</span>} />
            ))}
          </RowList>
        </Section>
      )}

      {review && review.improve.length > 0 && (
        <Section title="A mejorar">
          <RowList>
            {review.improve.map((text) => (
              <Row key={text} leading={<Dot tone="content" />} title={<span className="font-medium">{text}</span>} />
            ))}
          </RowList>
        </Section>
      )}

      {review && review.plan.length > 0 && (
        <Section title="Plan para la semana que viene">
          <RowList>
            {review.plan.map((item, index) => (
              <Row
                key={`${item.title}-${index}`}
                leading={<Dot tone={AGENDA_CATEGORIES[item.category].tone} />}
                title={item.title}
                subtitle={`${formatDay(item.day)} · ${AGENDA_CATEGORIES[item.category].label}`}
                trailing={
                  item.added ? (
                    <Chip tone="gym">En la agenda</Chip>
                  ) : (
                    <ActionButton action={addPlanItem.bind(null, review.id, index)} className="chip tone-acc h-8">
                      Añadir
                    </ActionButton>
                  )
                }
              />
            ))}
          </RowList>
        </Section>
      )}
    </>
  );
}
