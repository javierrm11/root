import { ImageResponse } from "next/og";
import { PALETTES } from "./theme";

/** Icono de la app (">_" en lima sobre grafito), en PNG del tamaño pedido. */
export function appIcon(size: number) {
  const { dark, accent } = PALETTES[0];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dark,
          color: accent,
          fontSize: size * 0.42,
          fontWeight: 700,
          letterSpacing: -size * 0.02,
          fontFamily: "monospace",
        }}
      >
        {">_"}
      </div>
    ),
    { width: size, height: size },
  );
}
