"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Tiempo fuera de la app a partir del cual, al volver, se piden los datos de nuevo. */
const AWAY_MS = 60_000;

/**
 * Al volver a la app tras un rato fuera (otra app, pantalla bloqueada…), refresca los datos.
 * Así lo que haya cambiado Claude por MCP aparece aunque las páginas estén en la caché del navegador.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) router.refresh();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [router]);
  return null;
}
