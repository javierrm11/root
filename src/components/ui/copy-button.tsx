"use client";

import { useState } from "react";
import { Button, type ButtonVariant } from "./button";

/** Copia un texto al portapapeles y lo confirma un momento. */
export function CopyButton({ value, label = "Copiar", variant = "small" }: { value: string; label?: string; variant?: ButtonVariant }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      icon="copy"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copiado" : label}
    </Button>
  );
}
