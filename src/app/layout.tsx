import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegister } from "@/components/layout/pwa-register";
import { DEFAULT_MODE, DEFAULT_PALETTE, PALETTES, themeScript } from "@/lib/theme";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "root", template: "%s · root" },
  description: "Organiza estudios, freelance, contenido y gimnasio en un solo sitio.",
  applicationName: "root",
  // "default": la app empieza debajo de la barra de estado (pintada con theme-color) y llega
  // hasta el borde inferior. Con "black-translucent" iOS acorta la ventana y la barra de abajo queda subida.
  appleWebApp: { capable: true, title: "root", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PALETTES[0].light,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-palette={DEFAULT_PALETTE}
      data-mode={DEFAULT_MODE}
      className={`${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
