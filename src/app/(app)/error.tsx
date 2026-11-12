"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState icon="x" title="Algo ha fallado">
      <p className="mb-4">{error.message || "No se han podido cargar los datos."}</p>
      <Button variant="ghost" onClick={reset}>
        Reintentar
      </Button>
    </EmptyState>
  );
}
