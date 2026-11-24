"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { MENU } from "./nav-config";

/** Avatar de la cabecera de Hoy (solo móvil) que abre el menú con los módulos de apoyo. */
export function MenuSheet({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className={cn("grid place-items-center active:opacity-70 md:hidden", !children && "size-11 rounded-xl bg-accent text-ink")}
      >
        {children ?? <Icon name="user" />}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Tu panel">
        <nav className="divide-y divide-line">
          {MENU.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-15 items-center gap-3 py-2">
              <span className={cn("tinted grid size-[38px] place-items-center rounded-xl", `tone-${item.tone}`)}>
                <Icon name={item.icon} size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-[13px] text-muted">{item.hint}</span>
              </span>
              <Icon name="chevron-right" size={18} className="text-muted" />
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
