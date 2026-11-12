"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { attachUpload, type UploadConfig } from "@/lib/upload";
import { Button, IconButton, type ButtonVariant } from "./button";
import { Field } from "./field";
import { Icon, type IconName } from "./icon";
import { Sheet } from "./sheet";

export type Trigger = {
  label: string;
  icon?: IconName;
  /** "icon" muestra solo el icono; "fab" es el botón flotante de captura. */
  variant?: ButtonVariant | "icon" | "fab";
  wide?: boolean;
};

/**
 * Formulario en bottom sheet, reutilizado para crear y editar todo.
 * Si recibe `upload`, sube el archivo a Storage antes de llamar a la Server Action.
 */
export function FormSheet({
  title,
  trigger,
  action,
  submitLabel = "Guardar",
  upload,
  children,
}: {
  title: string;
  trigger: Trigger;
  action: (fd: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  upload?: UploadConfig;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      try {
        if (upload) await attachUpload(fd, upload);
        const result = await action(fd);
        if (result?.error) return setError(result.error);
        formRef.current?.reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo ha fallado");
      }
    });
  }

  return (
    <>
      <TriggerButton {...trigger} onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
          {children}
          {upload && (
            <Field label={upload.label ?? "Archivo"}>
              <input
                type="file"
                name="file"
                accept={upload.accept}
                required={upload.required}
                className="text-sm text-muted file:mr-3 file:h-9 file:rounded-[9px] file:border-0 file:bg-surface-2 file:px-3.5 file:font-semibold file:text-fg"
              />
            </Field>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-content">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}

function TriggerButton({ label, icon, variant = "link", wide, onClick }: Trigger & { onClick: () => void }) {
  if (variant === "icon") return <IconButton icon={icon ?? "plus"} label={label} onClick={onClick} />;
  if (variant === "fab") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="pointer-events-auto grid size-[54px] place-items-center rounded-[17px] bg-accent text-ink shadow-[0_8px_20px_-6px_rgb(0_0_0/0.45)] transition-transform active:scale-95"
      >
        <Icon name={icon ?? "plus"} size={24} />
      </button>
    );
  }
  return (
    <Button variant={variant} wide={wide} icon={icon} onClick={onClick} className={cn(variant === "drop" && "mt-1")}>
      {label}
    </Button>
  );
}
