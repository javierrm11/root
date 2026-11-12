import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { ActionButton } from "./action-button";
import { Icon } from "./icon";

/** Fila con check que alterna un booleano (hábitos, contenidos, agenda). */
export function CheckRow({
  done,
  action,
  label,
  subtitle,
  square,
}: {
  done: boolean;
  action: () => Promise<ActionResult>;
  label: string;
  subtitle?: string;
  square?: boolean;
}) {
  return (
    <ActionButton action={action} pressed={done} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
      <span
        className={cn(
          "grid size-[22px] shrink-0 place-items-center border-[1.5px]",
          square ? "rounded-md" : "rounded-full",
          done ? "border-accent bg-accent text-ink" : "border-muted text-transparent",
        )}
      >
        <Icon name="check" size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-medium", done && "text-muted line-through")}>{label}</span>
        {subtitle && <span className="block text-[13px] text-muted">{subtitle}</span>}
      </span>
    </ActionButton>
  );
}
