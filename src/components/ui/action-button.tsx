"use client";

import { useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/cn";

/**
 * Botón que ejecuta una Server Action ya enlazada (`action.bind(null, id)`).
 * Sirve para marcar, alternar y borrar sin formulario.
 */
export function ActionButton({
  action,
  confirm,
  label,
  className,
  pressed,
  children,
}: {
  action: () => Promise<ActionResult>;
  /** Si se indica, pide confirmación antes (para borrar). */
  confirm?: string;
  label?: string;
  className?: string;
  pressed?: boolean;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={pending}
      className={cn("transition-opacity", pending && "opacity-50", className)}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      {children}
    </button>
  );
}
