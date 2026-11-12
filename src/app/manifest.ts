import type { MetadataRoute } from "next";
import { PALETTES } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  const background = PALETTES[0].dark;
  return {
    name: "root",
    short_name: "root",
    description: "Organiza estudios, freelance, contenido y gimnasio en un solo sitio.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: background,
    theme_color: background,
    icons: [
      { src: "/pwa/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
