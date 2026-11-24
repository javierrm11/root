import { ImageResponse } from "next/og";
import { Brote } from "@/components/ui/brote";
import { PALETTES } from "./theme";

/** Icono de la app (Brote sobre el azul de la paleta por defecto), en PNG del tamaño pedido. */
export function appIcon(size: number) {
  const { accent } = PALETTES[0];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: accent }}>
        <Brote size={Math.round(size * 0.72)} />
      </div>
    ),
    { width: size, height: size },
  );
}
