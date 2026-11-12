import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Contenido" };

export default function ContenidoPage() {
  return (
    <ComingSoon
      title="Contenido"
      eyebrow="TikTok"
      icon="video"
      phase={3}
      items={[
        "Banco de ideas con puntuación, mejores y peores",
        "Pipeline: idea → guion → grabado → editado → publicado",
        "Calendario de grabación, edición y publicación",
        "Ventanas de publicación recomendadas por Claude",
      ]}
    />
  );
}
