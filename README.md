# root

App personal (PWA) para organizar estudios, freelance, contenido y gimnasio. Fase 1: **Hoy + Estudios**.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica la migración `supabase/migrations/20261112000000_fase1.sql`. Tienes dos formas:
   - **SQL Editor** del dashboard: pega el archivo y ejecútalo.
   - **CLI**: `npx supabase link --project-ref <ref>` y después `npx supabase db push`.
3. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*, porque la app es solo para ti.
4. **Authentication → Users → Add user**: crea tu usuario con email y contraseña (marca *Auto Confirm User*).

### 2. Variables de entorno
Rellena `.env` (tienes la plantilla en `.env.example`) con los datos de **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GEMINI_API_KEY=            # fase 5
```

### 3. Arrancar
```bash
npm install
npm run dev
```
Abre http://localhost:3000 y entra con tu usuario.

### 4. Desplegar e instalar en el iPhone
1. Sube el repo a GitHub e impórtalo en [Vercel](https://vercel.com). Añade las mismas variables de entorno.
2. En el iPhone, abre la URL en **Safari → Compartir → Añadir a pantalla de inicio**.

Las convenciones del código y el roadmap están en [CLAUDE.md](CLAUDE.md).
