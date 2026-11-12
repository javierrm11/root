import { EmptyState } from "@/components/ui/primitives";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-[480px] px-5 pt-24">
      <EmptyState icon="repeat" title="Sin conexión">
        root necesita internet para leer tus datos. Vuelve a intentarlo cuando tengas cobertura.
      </EmptyState>
    </main>
  );
}
