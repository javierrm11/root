import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav, type NavItem } from "@/components/layout/tab-nav";
import { ContentTodayChip } from "@/features/contenido/components/today-chip";

const TABS: NavItem[] = [
  { href: "/contenido", label: "Calendario", exact: true },
  { href: "/contenido/pipeline", label: "Pipeline" },
  { href: "/contenido/ideas", label: "Ideas" },
];

/** Contenido (TikTok): pestañas arriba del todo y, debajo, el título con lo que toca hoy. */
export default function ContenidoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav items={TABS} label="Secciones de contenido" />
      <PageHeader
        title="Contenido"
        actions={
          <Suspense fallback={null}>
            <ContentTodayChip />
          </Suspense>
        }
      />
      {children}
    </>
  );
}
