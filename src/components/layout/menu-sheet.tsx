"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/constants";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";

const MENU: Array<{ href: string; label: string; hint: string; icon: IconName; tone: Tone }> = [
  { href: "/habitos", label: "Hábitos", hint: "Tus rutinas diarias y rachas", icon: "flame", tone: "gym" },
  { href: "/objetivos", label: "Objetivos del trimestre", hint: "Llega en la fase 4", icon: "target", tone: "acc" },
  { href: "/revision", label: "Revisión semanal", hint: "Llega en la fase 5", icon: "repeat", tone: "study" },
  { href: "/bandeja", label: "Bandeja de entrada", hint: "Lo que apuntas con el botón +", icon: "inbox", tone: "work" },
  { href: "/ajustes", label: "Ajustes", hint: "Paleta, modo y sesión", icon: "settings", tone: "mut" },
];

/** Avatar de la cabecera de Hoy que abre el menú con los módulos de apoyo. */
export function MenuSheet() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-xl bg-accent text-ink active:opacity-70"
      >
        <Icon name="user" />
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
