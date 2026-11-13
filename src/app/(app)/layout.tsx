import { MENU, MODULES } from "@/components/layout/nav-config";
import { BottomNav, SideNav } from "@/components/layout/tab-nav";
import { QuickCapture } from "@/features/hoy/components";

/**
 * Marco de la app: un contenedor fijo del tamaño de la pantalla donde solo hace scroll
 * el contenido (así la barra inferior no salta en la PWA de iOS).
 * - Móvil: columna de 480px, barra inferior y botón + flotante.
 * - Tablet (md): menú lateral con iconos y contenido más ancho.
 * - Ordenador (lg): menú lateral completo y páginas a dos columnas (ver <Columns>).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col md:flex-row">
      <SideNav items={MODULES} secondary={MENU} footer={<QuickCapture placement="side" />} />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[480px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-24 md:max-w-2xl md:px-8 md:pt-[calc(env(safe-area-inset-top)+32px)] md:pb-16 lg:max-w-5xl">
          {children}
        </div>
      </main>
      <QuickCapture placement="fab" />
      <BottomNav items={MODULES} />
    </div>
  );
}
