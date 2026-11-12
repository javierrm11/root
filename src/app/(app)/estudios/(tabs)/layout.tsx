import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TopNav, type NavItem } from "@/components/layout/tab-nav";
import { NextExamChip } from "@/features/estudios/components/next-exam-chip";

const TABS: NavItem[] = [
  { href: "/estudios", label: "Asignaturas", exact: true },
  { href: "/estudios/examenes", label: "Exámenes" },
  { href: "/estudios/flashcards", label: "Flashcards" },
  { href: "/estudios/historial", label: "Historial" },
];

/** Estudios: pestañas arriba del todo y, debajo, título con el aviso del próximo examen. */
export default function EstudiosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav items={TABS} label="Secciones de estudios" />
      <PageHeader
        title="Estudios"
        actions={
          <Suspense fallback={null}>
            <NextExamChip />
          </Suspense>
        }
      />
      {children}
    </>
  );
}
