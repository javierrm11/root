import type { ReactNode } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ActionResult } from "@/lib/actions";

/** Botón pequeño de las funciones con Gemini (resumir, flashcards, práctica…). */
export function AiButton({ action, icon = "sparkles", children }: { action: () => Promise<ActionResult>; icon?: IconName; children: ReactNode }) {
  return (
    <ActionButton action={action} className="tinted tone-acc inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-semibold">
      <Icon name={icon} size={14} />
      {children}
    </ActionButton>
  );
}
