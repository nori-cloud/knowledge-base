import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { registerSearchTool, registerSourceTools } from "fumadocs-core/mcp";
import { createFromSource } from "fumadocs-core/search/server";
import { getDocsLlms, getSource } from "@/lib/source";
import { config } from "@/system/config";

const handler = createMcpHandler(async () => {
  const mcp = new McpServer(
    { name: "knowledge-base", version: "1.0.0" },
    { capabilities: { tools: { listChanged: false } } },
  );
  registerSourceTools(mcp, getSource, await getDocsLlms());
  registerSearchTool(mcp, createFromSource(getSource));
  return mcp;
});

function handle(request: Request) {
  if (!config.MCP_ENABLED) return new Response(null, { status: 404 });
  return handler.fetch(request);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
