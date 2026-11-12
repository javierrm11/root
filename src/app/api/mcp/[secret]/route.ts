import { createMcpHandler } from "mcp-handler";
import { runAsOwner, sameSecret } from "@/lib/supabase/owner";
import { MCP_TOOLS } from "@/features/mcp/tools";

// Servidor MCP para conectar root a Claude (claude.ai → Conectores personalizados).
// La URL incluye MCP_SECRET: sin él, la ruta responde 404.

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

const handler = createMcpHandler(
  (server) => {
    for (const tool of MCP_TOOLS) {
      server.registerTool(tool.name, { title: tool.name, description: tool.description, inputSchema: tool.input }, async (args: unknown) => {
        try {
          const result = await tool.run(args as never);
          if (result && typeof result === "object" && "error" in result && result.error) {
            return { ...text(`Error: ${String(result.error)}`), isError: true };
          }
          return text(result === undefined ? "Hecho." : JSON.stringify(result));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { ...text(`Error: ${message.includes("NEXT_HTTP_ERROR_FALLBACK") ? "No encontrado" : message}`), isError: true };
        }
      });
    }
  },
  { serverInfo: { name: "root", version: "1.0.0" } },
);

async function handle(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!sameSecret(secret, process.env.MCP_SECRET)) return new Response("Not found", { status: 404 });
  return runAsOwner(() => handler(request));
}

export { handle as GET, handle as POST, handle as DELETE };
