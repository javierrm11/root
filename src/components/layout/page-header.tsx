import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** Cabecera de cada módulo: eyebrow opcional, título grande y acciones a la derecha. */
export function PageHeader({
  title,
  eyebrow,
  actions,
  back,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-5 flex flex-col gap-1">
      {back && (
        <Link href={back.href} className="-ml-1 mb-1 inline-flex h-11 w-fit items-center gap-0.5 text-[15px] font-semibold text-acc">
          <Icon name="chevron-left" size={22} />
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[13px] font-medium text-muted">{eyebrow}</p>}
          <h1 className="mt-1 text-[34px] leading-[1.1] font-bold tracking-[-0.035em]">{title}</h1>
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}
