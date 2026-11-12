import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Revisión semanal" };

export default function RevisionPage() {
  return (
    <ComingSoon
      title="Revisión"
      eyebrow="Cada domingo"
      icon="repeat"
      phase={5}
      back={{ href: "/", label: "Hoy" }}
      items={[
        "Resumen con IA de tu semana: estudio, entrenos, vídeos e ingresos",
        "Planificación de la semana siguiente",
        "Aviso el domingo con una notificación",
      ]}
    />
  );
}
