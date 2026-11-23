import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Datos de cada pantalla ("use cache: private" + cacheLife("pantalla")): 5 min en el navegador.
  // Con stale ≥ 5 min entran en el App Shell que se precarga con los enlaces (barra inferior, tarjetas…),
  // así que al pulsar, la pantalla sale ya con sus datos. refresh() en las Server Actions la vacía.
  cacheLife: {
    pantalla: { stale: 300, revalidate: 300, expire: 3600 },
  },
  experimental: {
    // Las páginas ya visitadas se quedan 5 min en el navegador y vuelven al instante.
    // Las Server Actions llaman a refresh(), que vacía esta caché: lo que cambias en la app no se queda viejo.
    // Lo que cambie fuera (Claude por MCP, otro dispositivo) se recarga al volver a la app (RefreshOnReturn).
    staleTimes: { dynamic: 300, static: 300 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
