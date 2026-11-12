import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Proyectos" };

export default function ProyectosPage() {
  return (
    <ComingSoon
      title="Proyectos"
      eyebrow="Freelance"
      icon="work"
      phase={2}
      items={[
        "Portfolio de proyectos y mini CRM de clientes",
        "Ideas puntuadas con ranking automático",
        "Backlog de features en Kanban y €/hora real",
        "Facturas y estimación de IVA e IRPF trimestral",
      ]}
    />
  );
}
