# root

App personal (PWA) para organizar estudios, freelance, contenido de TikTok y gimnasio, con IA (Gemini) y conexión a Claude por MCP.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta **en orden** las migraciones de `supabase/migrations/`, de la fase 1 a la 5. Puedes hacerlo pegando cada una en el SQL Editor, o con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
3. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*, porque la app es solo para ti.
4. **Authentication → Users → Add user**: crea tu usuario y marca *Auto Confirm User*.

### 2. Variables de entorno
Rellena `.env`; tienes la plantilla y la explicación de cada variable en `.env.example`. Lo mínimo para arrancar son las dos de Supabase. Para el resto:
- **IA**: `GEMINI_API_KEY`, que se obtiene en Google AI Studio.
- **Claude (MCP) y cron**:
  - `ROOT_EMAIL` y `ROOT_PASSWORD` (tu usuario de root);
  - `MCP_SECRET` (una cadena larga y aleatoria);
  - `CRON_SECRET`.
- **Notificaciones**: genera las claves con `npx web-push generate-vapid-keys` y ponlas en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`.

### 3. Arrancar
```bash
npm install
npm run dev
```

### 4. Desplegar e instalar en el iPhone
1. Sube el repo a GitHub e impórtalo en [Vercel](https://vercel.com) con las mismas variables de entorno. El cron del resumen diario ya está en `vercel.json`.
2. En el iPhone: Safari → Compartir → **Añadir a pantalla de inicio**. Abre root desde ahí y activa las notificaciones en Ajustes.

### 5. Conectar Claude
En root → **Ajustes → Claude · conector MCP**, copia la URL. Después, en claude.ai: Ajustes → Conectores → **Añadir conector personalizado** → pega la URL. La URL es secreta: no la compartas.

Las convenciones del código y el roadmap están en [CLAUDE.md](CLAUDE.md).
