import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos estáticos, iconos, archivos de la PWA y /api (MCP y cron llevan su propio secreto).
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|pwa/|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
