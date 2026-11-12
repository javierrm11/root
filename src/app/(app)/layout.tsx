import { BottomNav, type NavItem } from "@/components/layout/tab-nav";
import { QuickCapture } from "@/features/hoy/components";

const MODULES: NavItem[] = [
  { href: "/", label: "Hoy", icon: "home", exact: true },
  { href: "/estudios", label: "Estudios", icon: "book" },
  { href: "/proyectos", label: "Proyectos", icon: "work" },
  { href: "/contenido", label: "Contenido", icon: "video" },
  { href: "/gym", label: "Gym", icon: "gym" },
];

/**
 * Marco de la app: un contenedor fijo del tamaño de la pantalla donde solo hace scroll
 * el contenido. La barra inferior va dentro del marco (no flotando sobre la página), así
 * no salta en la PWA de iOS, que calcula mal la altura de la ventana hasta el primer scroll.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-24">{children}</div>
      </main>
      <QuickCapture />
      <BottomNav items={MODULES} />
    </div>
  );
}
