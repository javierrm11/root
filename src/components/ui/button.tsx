import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

const VARIANTS = {
  primary: "h-11 px-4 text-[15px] bg-accent text-ink",
  ghost: "h-11 px-4 text-[15px] bg-surface-2 text-fg",
  outline: "h-11 px-4 text-[15px] border border-line text-fg",
  small: "h-9 px-3.5 text-sm bg-surface-2 text-fg",
  link: "min-h-8 text-[13px] text-acc",
  drop: "min-h-13 w-full border-[1.5px] border-dashed border-line text-sm text-muted hover:border-acc hover:text-acc",
};

export type ButtonVariant = keyof typeof VARIANTS;

type StyleProps = { variant?: ButtonVariant; wide?: boolean; icon?: IconName };

export function buttonClass({ variant = "primary", wide }: StyleProps = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-opacity active:opacity-70 disabled:opacity-50",
    VARIANTS[variant],
    wide && "w-full",
  );
}

export function Button({ variant, wide, icon, className, children, type = "button", ...props }: StyleProps & ComponentProps<"button">) {
  return (
    <button type={type} className={cn(buttonClass({ variant, wide }), className)} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, wide, icon, className, children, ...props }: StyleProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClass({ variant, wide }), className)} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </Link>
  );
}

type IconButtonProps = { icon: IconName; label: string; small?: boolean } & Omit<ComponentProps<"button">, "children">;

export const iconButtonClass = (small?: boolean) =>
  cn(
    "grid shrink-0 place-items-center rounded-xl border border-line text-fg transition-opacity active:opacity-70 disabled:opacity-50",
    small ? "size-9" : "size-11",
  );

export function IconButton({ icon, label, small, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={cn(iconButtonClass(small), className)} {...props}>
      <Icon name={icon} size={small ? 16 : 20} />
    </button>
  );
}
