"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./button";

/** Bottom sheet sobre <dialog> nativo: foco atrapado, Escape y fondo para cerrar. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col gap-4 px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <span className="mx-auto h-1.5 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton icon="x" label="Cerrar" small onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
