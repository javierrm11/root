import { BottomNav, type NavItem } from "@/components/layout/tab-nav";
import { QuickCapture } from "@/features/hoy/components";

const MODULES: NavItem[] = [
  { href: "/", label: "Hoy", icon: "home", exact: true },
  { href: "/estudios", label: "Estudios", icon: "book" },
  { href: "/proyectos", label: "Proyectos", icon: "work" },
  { href: "/contenido", label: "Contenido", icon: "video" },
  { href: "/gym", label: "Gym", icon: "gym" },
];

/** Marco de la app: columna móvil, botón + de captura y barra inferior. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+140px)]">
        {children}
      </main>
      <QuickCapture />
      <BottomNav items={MODULES} />
    </>
  );
}
