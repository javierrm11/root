"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions";
import { IconButton } from "./button";
import { Input } from "./field";

/** Campo + botón para añadir un elemento a una lista sin abrir un sheet. */
export function InlineAdd({
  action,
  placeholder,
  name = "title",
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  placeholder: string;
  name?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(fd);
          setError(result?.error ?? null);
          if (!result?.error) formRef.current?.reset();
        });
      }}
    >
      <div className="flex gap-2">
        <Input name={name} placeholder={placeholder} aria-label={placeholder} required className="h-10" />
        <IconButton type="submit" icon="plus" label="Añadir" disabled={pending} className="size-10" />
      </div>
      {error && <p className="text-[13px] text-content">{error}</p>}
    </form>
  );
}
