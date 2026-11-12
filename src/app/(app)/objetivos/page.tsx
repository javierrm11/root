import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Objetivos" };

export default function ObjetivosPage() {
  return (
    <ComingSoon
      title="Objetivos"
      eyebrow="Del trimestre"
      icon="target"
      phase={4}
      back={{ href: "/", label: "Hoy" }}
      items={[
        "Objetivos conectados a los módulos: «Aprobar Redes», «3 clientes nuevos», «100 kg en press banca»",
        "El progreso se actualiza solo con tus datos",
      ]}
    />
  );
}
