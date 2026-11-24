"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Brote } from "@/components/ui/brote";
import { Icon } from "@/components/ui/icon";
import type { MenuItem, NavItem } from "./nav-config";

export type { NavItem } from "./nav-config";

type ViewProps = { items: NavItem[]; label?: string; secondary?: MenuItem[]; footer?: ReactNode; pathname: string | null };

const isActive = (pathname: string | null, { href, exact }: NavItem) =>
  pathname !== null && (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

/**
 * usePathname() es dato de la URL: con Cache Components debe ir tras <Suspense>.
 * El fallback pinta la misma barra sin pestaña activa, así no hay salto.
 */
function withPathname(View: (props: ViewProps) => ReactNode) {
  function Live(props: Omit<ViewProps, "pathname">) {
    return <View {...props} pathname={usePathname()} />;
  }
  return function Nav(props: Omit<ViewProps, "pathname">) {
    return (
      <Suspense fallback={<View {...props} pathname={null} />}>
        <Live {...props} />
      </Suspense>
    );
  };
}

/** Barra inferior estilo app (solo móvil): 5 módulos con icono y etiqueta. */
export const BottomNav = withPathname(function BottomNavView({ items, pathname }) {
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[var(--nav-inset)] md:hidden">
      <div className="mx-auto grid h-14 max-w-[480px] grid-cols-5 px-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px]", active ? "font-extrabold text-acc" : "font-semibold text-muted")}
            >
              {item.icon && <Icon name={item.icon} size={22} />}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

/** Enlace del menú lateral: icono con etiqueta debajo en tablet, en fila en ordenador. */
function SideLink({ item, label, active }: { item: NavItem; label: string; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm",
        active ? "bg-surface text-acc shadow-[var(--shadow)] lg:text-fg" : "text-muted hover:bg-surface hover:text-fg",
      )}
    >
      {item.icon && <Icon name={item.icon} size={22} className={cn("shrink-0", active && "lg:text-acc")} />}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/** Menú lateral (tablet y ordenador): módulos, módulos de apoyo y captura rápida. */
export const SideNav = withPathname(function SideNavView({ items, secondary = [], footer, pathname }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="hidden shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-bg px-2 pt-[calc(env(safe-area-inset-top)+20px)] pb-5 md:flex md:w-[84px] lg:w-60 lg:px-3"
    >
      <Link href="/" className="mb-5 flex items-center justify-center gap-2.5 lg:justify-start lg:px-3" aria-label="root, ir a Hoy">
        <Brote size={40} />
        <span className="hidden text-xl font-extrabold tracking-tight lg:inline">root</span>
      </Link>
      {items.map((item) => (
        <SideLink key={item.href} item={item} label={item.label} active={isActive(pathname, item)} />
      ))}
      <div className="mx-2 my-3 border-t border-line" />
      {secondary.map((item) => (
        <SideLink key={item.href} item={item} label={item.short} active={isActive(pathname, item)} />
      ))}
      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </nav>
  );
});

/** Pestañas superiores de un módulo: control segmentado (la activa en blanco sobre gris). */
export const TopNav = withPathname(function TopNavView({ items, label, pathname }) {
  return (
    <nav aria-label={label} className="mb-3.5 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1 [scrollbar-width:none] md:max-w-2xl">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 grow items-center justify-center rounded-xl px-2.5 text-[13px] whitespace-nowrap transition-colors",
              active ? "bg-surface font-extrabold text-fg shadow-[var(--shadow)]" : "font-semibold text-muted hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
});
