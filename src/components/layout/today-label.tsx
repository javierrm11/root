import { Suspense } from "react";
import { io } from "next/cache";
import { capitalize, formatLongDay, todayISO } from "@/lib/dates";

async function Today() {
  await io(); // la fecha se calcula en cada petición, no en el build ni en el prefetch
  return <>{capitalize(formatLongDay(todayISO()))}</>;
}

/** "Miércoles, 11 de noviembre" sin bloquear el resto de la cabecera. */
export function TodayLabel() {
  return (
    <Suspense fallback={<>&nbsp;</>}>
      <Today />
    </Suspense>
  );
}
