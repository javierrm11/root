import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav, type NavItem } from "@/components/layout/tab-nav";
import { PendingChip } from "@/features/proyectos/components/pending-chip";

const TABS: NavItem[] = [
  { href: "/proyectos", label: "Proyectos", exact: true },
  { href: "/proyectos/ideas", label: "Ideas" },
  { href: "/proyectos/clientes", label: "Clientes" },
  { href: "/proyectos/finanzas", label: "Finanzas" },
];

/** Proyectos: pestañas arriba del todo y, debajo, el título con lo pendiente de cobro. */
export default function ProyectosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav items={TABS} label="Secciones de proyectos" />
      <PageHeader
        title="Proyectos"
        actions={
          <Suspense fallback={null}>
            <PendingChip />
          </Suspense>
        }
      />
      {children}
    </>
  );
}
