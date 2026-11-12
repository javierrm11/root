"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icon";

export type NavItem = { href: string; label: string; icon?: IconName; exact?: boolean };

type ViewProps = { items: NavItem[]; label?: string; pathname: string | null };

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

/** Barra inferior estilo app: 5 módulos con icono y etiqueta. */
export const BottomNav = withPathname(function BottomNavView({ items, pathname }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid h-14 max-w-[480px] grid-cols-5 px-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-acc" : "text-muted")}
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

/** Pestañas superiores de un módulo (estructura B: subrayado bajo la activa). */
export const TopNav = withPathname(function TopNavView({ items, label, pathname }) {
  return (
    <nav
      aria-label={label}
      className="-mx-5 mb-2 grid border-b border-line px-3"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 items-center justify-center truncate border-b-2 px-1 text-[13px] font-semibold",
              active ? "border-accent text-fg" : "border-transparent text-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
});
