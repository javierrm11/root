import { Suspense } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Icon } from "@/components/ui/icon";
import { LinkPills, ProgressBar, Row, RowList, Section, Skeleton, Stat, StatRow } from "@/components/ui/primitives";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { PERIODS, formatDay, todayISO, type Period } from "@/lib/dates";
import { formatHours, formatMoney, formatPerHour } from "@/lib/format";
import { deleteRow } from "@/features/common/actions";
import { saveExpense } from "@/features/proyectos/actions";
import { ExpenseFields } from "@/features/proyectos/components/fields";
import { AddInvoiceSheet, InvoiceRow } from "@/features/proyectos/components/rows";
import { getFinances } from "@/features/proyectos/queries";

export const metadata = { title: "Finanzas" };

type SearchParams = Promise<{ periodo?: string }>;

export default function FinanzasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <Finances searchParams={searchParams} />
    </Suspense>
  );
}

async function Finances({ searchParams }: { searchParams: SearchParams }) {
  const { periodo } = await searchParams;
  const period: Period = periodo && periodo in PERIODS ? (periodo as Period) : "mes";
  const f = await getFinances(period);
  const today = todayISO();
  const maxPerHour = Math.max(1, ...f.perClient.map((c) => c.perHour));

  return (
    <>
      <LinkPills
        items={(Object.keys(PERIODS) as Period[]).map((p) => ({ href: `?periodo=${p}`, label: PERIODS[p], active: p === period }))}
      />
      <StatRow>
        <Stat value={formatMoney(f.billed)} label="Facturado" />
        <Stat value={formatMoney(f.collected)} label="Cobrado" />
        <Stat value={formatMoney(f.outstanding)} label="Por cobrar" accent />
      </StatRow>

      <Section title="Balance" aside={<span className="text-[13px] text-muted">Desde el {formatDay(f.start)}</span>}>
        <RowList>
          <Row title="Cobrado" trailing={<span className="font-mono text-sm font-semibold">{formatMoney(f.collected)}</span>} />
          <Row title="Gastos" trailing={<span className="font-mono text-sm font-semibold">− {formatMoney(f.spent)}</span>} />
          <Row title="Beneficio" trailing={<span className="font-mono text-sm font-semibold text-acc">{formatMoney(f.collected - f.spent)}</span>} />
          <Row title="Horas trabajadas" trailing={<span className="font-mono text-sm font-semibold">{formatHours(f.hours)}</span>} />
          <Row title="€/hora real" subtitle="Facturado ÷ horas" trailing={<span className="font-mono text-sm font-semibold text-acc">{formatPerHour(f.perHour)}</span>} />
        </RowList>
      </Section>

      <Section title="Facturas" aside={<AddInvoiceSheet clients={f.clients} projects={f.projects} today={today} />}>
        {f.invoices.length ? (
          <div className="divide-y divide-line">
            {f.invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} clients={f.clients} projects={f.projects} today={today} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Sin facturas en este periodo. Aquí solo se registran: emítelas con tu herramienta de facturación.</p>
        )}
      </Section>

      <Section
        title="Gastos"
        aside={
          <FormSheet title="Nuevo gasto" trigger={{ label: "Añadir" }} action={saveExpense.bind(null, null)}>
            <ExpenseFields today={today} />
          </FormSheet>
        }
      >
        {f.expenses.length ? (
          <RowList>
            {f.expenses.map((e) => (
              <Row
                key={e.id}
                title={e.concept}
                subtitle={`${EXPENSE_CATEGORIES[e.category].label} · ${formatDay(e.day)}`}
                trailing={
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold">{formatMoney(e.amount)}</span>
                    <ActionButton action={deleteRow.bind(null, "expenses", e.id)} confirm="¿Borrar este gasto?" label="Borrar gasto" className="grid size-8 place-items-center text-muted">
                      <Icon name="x" size={15} />
                    </ActionButton>
                  </span>
                }
              />
            ))}
          </RowList>
        ) : (
          <p className="text-sm text-muted">Sin gastos en este periodo.</p>
        )}
      </Section>

      {f.perClient.length > 0 && (
        <Section title="€/hora por cliente">
          <div className="flex flex-col gap-3">
            {f.perClient.map((c) => (
              <div key={c.id} className="grid grid-cols-[110px_minmax(0,1fr)_72px] items-center gap-2.5">
                <span className="truncate text-sm font-semibold">{c.name}</span>
                <ProgressBar value={(c.perHour / maxPerHour) * 100} tone="study" />
                <span className="text-right font-mono text-sm font-semibold">{formatPerHour(c.perHour)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="pt-2 text-[13px] text-muted">
        Sin IVA ni IRPF porque no estás dado de alta como autónomo. Si te das de alta, aquí irán las estimaciones de los modelos 303 y 130.
      </p>
    </>
  );
}
