"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * Para las sesiones en directo (repaso, entreno, práctica), que guardan sin refrescar la pantalla.
 * Si se ha guardado algo, al salir se refrescan los datos: así la caché del navegador
 * (staleTimes en next.config.ts) no enseña contadores viejos en las páginas ya visitadas.
 * Devuelve `markChanged`, que se llama tras cada guardado.
 */
export function useRefreshOnLeave() {
  const router = useRouter();
  const changed = useRef(false);
  useEffect(
    () => () => {
      if (changed.current) router.refresh();
    },
    [router],
  );
  return useCallback(() => {
    changed.current = true;
  }, []);
}
