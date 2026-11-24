# root

App personal (PWA) para organizar estudios, freelance, contenido de TikTok y gimnasio, con IA (Gemini) y conexión a Claude por MCP.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta **en orden** las migraciones de `supabase/migrations/`, de la fase 1 a la 7. Puedes hacerlo pegando cada una en el SQL Editor, o con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
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
1. Sube el repo a GitHub e impórtalo en [Vercel](https://vercel.com) con las mismas variables de entorno. Los dos crons de avisos (8:00 y 20:00) ya están en `vercel.json`.
2. En el iPhone: Safari → Compartir → **Añadir a pantalla de inicio**. Abre root desde ahí y activa las notificaciones en Ajustes.

### 5. Conectar Claude
En root → **Ajustes → Claude · conector MCP**, copia la URL. Después, en claude.ai: Ajustes → Conectores → **Añadir conector personalizado** → pega la URL. La URL es secreta: no la compartas.

Para Claude Code, el mismo conector: `claude mcp add --transport http root <URL>`.

### 6. Estudiar con Claude
Claude lee tus PDF y boletines (`leer_archivo`) y te prepara la práctica dentro de la app:
1. En un tema, **Tipos de ejercicio → Pedir a Claude** copia un mensaje: pégalo en Claude. Lee el boletín y guarda los tipos.
2. En cada tipo, **Cómo se resuelve → Pedir a Claude**: teoría, pasos y un ejemplo resuelto.
3. **Practicar → Test o Desarrollo → Pedir a Claude**: la tanda aparece en la app, con pista y solución ocultas.
4. Con un 80 % de aciertos el tipo queda dominado y pasas al siguiente; si no, pide otra tanda centrada en lo fallado.

Para el plan de exámenes: en Estudios › Plan, **Pedir el plan a Claude** copia el mensaje; Claude reparte el estudio día a día (sin horas) y te avisa al móvil. Si te atrasas, **Reorganizar** reparte lo pendiente antes de cada examen.

Si activas «Tipos de ejercicio» en Ajustes, Gemini puede detectar los tipos de un tema con un botón; la guía y las tandas son de Claude.

Las convenciones del código y el roadmap están en [CLAUDE.md](CLAUDE.md).
