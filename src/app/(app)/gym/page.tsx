import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Gym" };

export default function GymPage() {
  return (
    <ComingSoon
      title="Gym"
      icon="gym"
      phase={4}
      items={[
        "Modo entreno con series, peso y descanso automático",
        "Rutinas, récords personales y 1RM estimado",
        "Gráficas de progreso, peso corporal y fotos",
      ]}
    />
  );
}
