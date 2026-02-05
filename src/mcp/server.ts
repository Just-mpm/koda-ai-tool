/**
 * MCP Server - Expoe os comandos ai-tool como tools MCP
 *
 * Este servidor permite que ferramentas como Claude Desktop
 * acessem os comandos map, dead e impact via protocolo MCP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools.js";
import { VERSION } from "../index.js";

/**
 * Cria e configura o servidor MCP
 */
const server = new McpServer({
  name: "ai-tool-mcp-server",
  version: VERSION,
});

// Registra todas as ferramentas MCP
registerAllTools(server);

/**
 * Inicia o servidor MCP via stdio
 *
 * O servidor escuta comandos JSON-RPC via stdin e responde via stdout.
 * Logs de diagnostico vao para stderr (NUNCA para stdout).
 */
export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log para stderr (nunca stdout - stdout e para JSON-RPC)
  console.error(`[ai-tool] MCP server v${VERSION} running via stdio`);
}
