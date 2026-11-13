import Link from "next/link";
import { Suspense } from "react";
import { CoverArt } from "@/components/ui/cover-art";
import { FormSheet } from "@/components/ui/form-sheet";
import { Chip, EmptyState, ProgressBar, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { PROJECT_STATUS } from "@/lib/constants";
import { formatHours, formatPerHour } from "@/lib/format";
import { saveProject } from "@/features/proyectos/actions";
import { ProjectFields } from "@/features/proyectos/components/fields";
import { LogHoursSheet } from "@/features/proyectos/components/rows";
import { getProjectsOverview, type ProjectSummary } from "@/features/proyectos/queries";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Proyectos" };

export default function ProyectosPage() {
  return (
    <Suspense fallback={<Skeleton lines={5} />}>
      <Projects />
    </Suspense>
  );
}

async function Projects() {
  const { userId, clients, active, delivered, stats } = await getProjectsOverview();
  const today = todayISO();

  return (
    <>
      <StatRow>
        <Stat value={stats.active} label="En curso" accent />
        <Stat value={stats.perHour === null ? "—" : formatPerHour(stats.perHour).replace("/h", "")} label="€/hora media" />
        <Stat value={formatHours(stats.monthHours)} label="Horas este mes" />
      </StatRow>

      <Section
        title="En marcha"
        aside={
          active.length > 0 && <LogHoursSheet projects={active} today={today} trigger={{ label: "Apuntar horas" }} />
        }
      >
        {active.length ? (
          <ProjectList projects={active} />
        ) : (
          <EmptyState icon="work" title="Sin proyectos en marcha">
            Añade tus trabajos freelance y tus proyectos propios: features, horas, facturas y €/hora real.
          </EmptyState>
        )}
      </Section>

      {delivered.length > 0 && (
        <Section title="Terminados" aside={<span className="text-[13px] text-muted">Portfolio</span>}>
          <ProjectList projects={delivered} />
        </Section>
      )}

      <FormSheet
        title="Nuevo proyecto"
        trigger={{ label: "Añadir proyecto", icon: "plus", variant: "drop" }}
        action={saveProject.bind(null, null)}
        upload={{ userId, folder: "covers", accept: "image/*", label: "Foto de portada (opcional)" }}
        submitLabel="Crear"
      >
        <ProjectFields clients={clients} />
      </FormSheet>
    </>
  );
}

function ProjectList({ projects }: { projects: Array<ProjectSummary & { coverUrl: string | null }> }) {
  return (
    <div className="list-grid">
      {projects.map((p) => {
        const status = PROJECT_STATUS[p.status];
        return (
          <Link key={p.id} href={`/proyectos/proyecto/${p.id}`} className="flex items-center gap-3.5 py-3.5">
            <CoverArt item={p} url={p.coverUrl} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[15px] leading-snug font-semibold">{p.name}</span>
              <span className="font-mono text-xs text-muted">
                {p.clientName} · {p.perHour === null ? formatHours(p.hours) : formatPerHour(p.perHour)}
              </span>
              <span className="mt-1 flex items-center gap-2.5">
                <ProgressBar value={p.total ? (p.done / p.total) * 100 : 0} className="flex-1" />
                <span className="font-mono text-xs text-muted">
                  {p.done}/{p.total}
                </span>
                <Chip tone={status.tone}>{status.label}</Chip>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
