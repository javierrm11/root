import { MENU, MODULES } from "@/components/layout/nav-config";
import { BottomNav, SideNav } from "@/components/layout/tab-nav";
import { QuickCapture } from "@/features/hoy/components";

/**
 * Marco de la app.
 * - Móvil: la página hace scroll normal y la barra inferior va fija abajo del todo (como la PWA
 *   que ya funciona bien en el iPhone); el botón + flota encima de la barra.
 * - Tablet (md): marco fijo del tamaño de la pantalla, menú lateral con iconos y solo hace scroll el contenido.
 * - Ordenador (lg): menú lateral completo y páginas a dos columnas (ver <Columns>).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:fixed md:inset-0 md:flex md:flex-row">
      <SideNav items={MODULES} secondary={MENU} footer={<QuickCapture placement="side" />} />
      <main className="md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain">
        <div className="mx-auto max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(var(--nav-inset)+150px)] md:max-w-2xl md:px-8 md:pt-[calc(env(safe-area-inset-top)+32px)] md:pb-16 lg:max-w-5xl">
          {children}
        </div>
      </main>
      <QuickCapture placement="fab" />
      <BottomNav items={MODULES} />
    </div>
  );
}
