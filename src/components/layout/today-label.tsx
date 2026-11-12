import { Suspense } from "react";
import { connection } from "next/server";
import { capitalize, formatLongDay, todayISO } from "@/lib/dates";

async function Today() {
  await connection(); // la fecha se calcula en cada petición, no en el build
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
