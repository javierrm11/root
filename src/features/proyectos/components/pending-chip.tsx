import { cacheLife } from "next/cache";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { getOutstanding } from "../queries";

/** Aviso de lo pendiente de cobro en la cabecera de Proyectos. */
export async function PendingChip() {
  "use cache: private";
  cacheLife("pantalla");
  const outstanding = await getOutstanding();
  if (!outstanding) return null;
  return (
    <Link href="/proyectos/finanzas" className="chip tone-work h-9 text-[13px]">
      {formatMoney(outstanding)} por cobrar
    </Link>
  );
}
