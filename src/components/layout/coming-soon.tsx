import { EmptyState, Chip } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icon";
import { PageHeader } from "./page-header";

/** Pantalla de un módulo que llega en una fase posterior, con la misma cabecera que el resto. */
export function ComingSoon({
  title,
  eyebrow,
  icon,
  phase,
  items,
  back,
}: {
  title: string;
  eyebrow?: string;
  icon: IconName;
  phase: number;
  items: string[];
  back?: { href: string; label: string };
}) {
  return (
    <>
      <PageHeader title={title} eyebrow={eyebrow} back={back} />
      <EmptyState icon={icon} title={`Llega en la fase ${phase}`}>
        <Chip tone="acc" className="mb-3">
          Fase {phase}
        </Chip>
        <p className="mb-2">Aquí vivirán:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </EmptyState>
    </>
  );
}
