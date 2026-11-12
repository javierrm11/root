import { PageHeader } from "@/components/layout/page-header";
import { TopNav, type NavItem } from "@/components/layout/tab-nav";

const TABS: NavItem[] = [
  { href: "/gym", label: "Entreno", exact: true },
  { href: "/gym/rutinas", label: "Rutinas" },
  { href: "/gym/progreso", label: "Progreso" },
  { href: "/gym/cuerpo", label: "Cuerpo" },
];

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav items={TABS} label="Secciones de gym" />
      <PageHeader title="Gym" />
      {children}
    </>
  );
}
