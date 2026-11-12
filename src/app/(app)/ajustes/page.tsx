import { Suspense } from "react";
import { headers } from "next/headers";
import { PageHeader } from "@/components/layout/page-header";
import { ThemePicker } from "@/components/layout/theme-picker";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Chip, Row, RowList, Section, Skeleton } from "@/components/ui/primitives";
import { aiConfigured } from "@/lib/ai";
import { AI_FEATURES, NOTIFICATIONS, keysOf } from "@/lib/constants";
import { PUSH_PUBLIC_KEY } from "@/lib/push";
import { signOut } from "@/app/login/actions";
import { setSetting } from "@/features/ajustes/actions";
import { CopyButton, PushSetup, Toggle } from "@/features/ajustes/components";
import { getSettings } from "@/features/ajustes/queries";
import { MCP_TOOLS } from "@/features/mcp/tools";

export const metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <>
      <PageHeader title="Ajustes" back={{ href: "/", label: "Hoy" }} />
      <ThemePicker />
      <Suspense fallback={<Skeleton lines={6} />}>
        <Preferences />
      </Suspense>
      <Section title="Sesión">
        <form action={signOut}>
          <Button type="submit" variant="ghost" icon="logout" wide>
            Cerrar sesión
          </Button>
        </form>
      </Section>
    </>
  );
}

async function Preferences() {
  const settings = await getSettings();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const secret = process.env.MCP_SECRET;
  const mcpUrl = secret ? `${origin}/api/mcp/${secret}` : null;
  const mcpReady = Boolean(mcpUrl && process.env.ROOT_EMAIL && process.env.ROOT_PASSWORD);

  return (
    <>
      <Section title="IA · Gemini" aside={<Chip tone={aiConfigured() ? "gym" : "mut"}>{aiConfigured() ? "Conectado" : "Sin clave"}</Chip>}>
        <p className="mb-1 text-[13px] text-muted">Dentro de la app: resume temas, crea flashcards desde tus PDF y prepara la revisión del domingo.</p>
        <RowList>
          {keysOf(AI_FEATURES).map((key) => (
            <ActionButton key={key} action={setSetting.bind(null, "ai", key, !settings.ai[key])} pressed={settings.ai[key]} className="block w-full text-left">
              <Row title={AI_FEATURES[key].label} subtitle={AI_FEATURES[key].short} trailing={<Toggle on={settings.ai[key]} />} />
            </ActionButton>
          ))}
        </RowList>
      </Section>

      <Section title="Claude · conector MCP" aside={<Chip tone={mcpReady ? "gym" : "mut"}>{mcpReady ? "Listo" : "Sin configurar"}</Chip>}>
        <p className="mb-3 text-[13px] text-muted">
          Claude (tu suscripción de claude.ai) lee y escribe tus datos desde el chat o la app del iPhone: planes de estudio, ventanas para publicar, horas, ideas…
        </p>
        {mcpUrl ? (
          <>
            <code className="block rounded-lg bg-surface-2 px-3 py-2.5 font-mono text-xs break-all">{mcpUrl}</code>
            <div className="mt-2 flex gap-2">
              <CopyButton value={mcpUrl} label="Copiar URL" />
            </div>
            <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-[13px] text-muted">
              <li>Despliega la app (claude.ai no llega a localhost).</li>
              <li>En claude.ai: Ajustes → Conectores → Añadir conector personalizado.</li>
              <li>Pega la URL. Es secreta: quien la tenga accede a tus datos.</li>
            </ol>
          </>
        ) : (
          <p className="text-[13px] text-muted">Rellena MCP_SECRET, ROOT_EMAIL y ROOT_PASSWORD en .env para activarlo.</p>
        )}
        <h3 className="section-title mt-5 mb-1">Herramientas que ve Claude</h3>
        <RowList>
          {MCP_TOOLS.map((tool) => (
            <Row key={tool.name} title={<span className="font-mono text-[13px]">{tool.name}</span>} subtitle={tool.description} />
          ))}
        </RowList>
      </Section>

      <Section title="Notificaciones" aside={<span className="text-[13px] text-muted">Resumen diario por la mañana</span>}>
        <PushSetup publicKey={PUSH_PUBLIC_KEY} />
        <RowList className="mt-2">
          {keysOf(NOTIFICATIONS).map((key) => (
            <ActionButton
              key={key}
              action={setSetting.bind(null, "notifications", key, !settings.notifications[key])}
              pressed={settings.notifications[key]}
              className="block w-full text-left"
            >
              <Row title={NOTIFICATIONS[key].label} subtitle={NOTIFICATIONS[key].short} trailing={<Toggle on={settings.notifications[key]} />} />
            </ActionButton>
          ))}
        </RowList>
      </Section>
    </>
  );
}
