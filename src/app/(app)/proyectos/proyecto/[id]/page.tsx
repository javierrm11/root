import Link from "next/link";
import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { CoverArt } from "@/components/ui/cover-art";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { Chip, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { PROJECT_STATUS } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { formatHours, formatMoney, formatPerHour } from "@/lib/format";
import { addFeature, deleteProject, saveProject } from "@/features/proyectos/actions";
import { FeatureBoard } from "@/features/proyectos/components/feature-board";
import { FeatureFields, ProjectFields } from "@/features/proyectos/components/fields";
import { AddInvoiceSheet, InvoiceRow, LogHoursSheet, TimeEntryRow } from "@/features/proyectos/components/rows";
import { getProjectDetail } from "@/features/proyectos/queries";

type Params = Promise<{ id: string }>;

export default function ProjectPage({ params }: { params: Params }) {
  return (
    <>
      <Link href="/proyectos" className="-ml-1 mb-2 inline-flex h-11 items-center gap-0.5 text-[15px] font-semibold text-acc">
        <Icon name="chevron-left" size={22} />
        Proyectos
      </Link>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Project params={params} />
      </Suspense>
    </>
  );
}

async function Project({ params }: { params: Params }) {
  const { id } = await params;
  const { userId, today, clients, project, coverUrl, features, entries, invoices, activeProjects } = await getProjectDetail(id);
  const status = PROJECT_STATUS[project.status];
  const dates = [project.start_date, project.end_date].filter((d): d is string => Boolean(d)).map(formatDay).join(" → ");
  const links = [
    ["Web", project.website],
    ["Repositorio", project.repo_url],
  ].filter((l): l is [string, string] => Boolean(l[1]));

  return (
    <>
      <CoverArt item={project} url={coverUrl} variant="banner" badge={status.label} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em]">{project.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted">{[project.clientName, dates].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <LogHoursSheet projects={activeProjects} projectId={project.id} today={today} trigger={{ label: "Apuntar horas", icon: "clock", variant: "icon" }} />
          <FormSheet
            title="Editar proyecto"
            trigger={{ label: "Editar proyecto", icon: "pencil", variant: "icon" }}
            action={saveProject.bind(null, project.id)}
            upload={{ userId, folder: "covers", accept: "image/*", label: "Cambiar foto de portada (opcional)" }}
          >
            <ProjectFields project={project} clients={clients} />
          </FormSheet>
        </div>
      </div>

      <div className="mt-5">
        <StatRow>
          <Stat value={formatPerHour(project.perHour)} label="€/hora real" accent />
          <Stat value={formatHours(project.hours)} label="Trabajadas" />
          <Stat value={`${project.done}/${project.total}`} label="Features" />
        </StatRow>
      </div>

      <Section title="Ficha" aside={<Chip tone={status.tone}>{status.label}</Chip>}>
        {project.description && <p className="mb-3 text-[15px] leading-relaxed">{project.description}</p>}
        {project.tech.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {project.tech.map((t) => (
              <Chip key={t} tone="study">
                {t}
              </Chip>
            ))}
          </div>
        )}
        <RowList>
          {project.budget !== null && <Row title="Presupuesto" trailing={<span className="font-mono text-sm font-semibold">{formatMoney(Number(project.budget))}</span>} />}
          <Row title="Facturado" trailing={<span className="font-mono text-sm font-semibold">{formatMoney(project.invoiced)}</span>} />
          {links.map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noreferrer" className="block">
              <Row title={label} subtitle={url.replace(/^https?:\/\//, "")} trailing={<Icon name="chevron-right" size={18} className="text-muted" />} />
            </a>
          ))}
        </RowList>
      </Section>

      <Section
        title="Features"
        aside={
          <FormSheet title="Nueva feature" trigger={{ label: "Añadir" }} action={addFeature.bind(null, project.id)}>
            <FeatureFields />
          </FormSheet>
        }
      >
        <FeatureBoard features={features} />
      </Section>

      <Section
        title="Horas"
        aside={<LogHoursSheet projects={activeProjects} projectId={project.id} today={today} trigger={{ label: "Apuntar" }} />}
      >
        {entries.length ? (
          <div className="divide-y divide-line">
            {entries.map((entry) => (
              <TimeEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Apunta las horas al terminar cada sesión para saber tu €/hora real.</p>
        )}
      </Section>

      {project.client_id && (
        <Section
          title="Facturas"
          aside={<AddInvoiceSheet clients={clients} projects={activeProjects} defaults={{ client_id: project.client_id, project_id: project.id }} today={today} />}
        >
          {invoices.length ? (
            <div className="divide-y divide-line">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} clients={clients} projects={activeProjects} today={today} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sin facturas registradas para este proyecto.</p>
          )}
        </Section>
      )}

      <div className="mt-6 flex justify-center">
        <ActionButton
          action={deleteProject.bind(null, project.id)}
          confirm={`¿Borrar «${project.name}» con sus features y horas?`}
          className="min-h-11 text-[13px] font-semibold text-muted"
        >
          Borrar proyecto
        </ActionButton>
      </div>
    </>
  );
}
