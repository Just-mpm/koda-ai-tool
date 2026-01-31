/**
 * MCP Server - Expoe os comandos ai-tool como tools MCP
 *
 * Este servidor permite que ferramentas como Claude Desktop
 * acessem os comandos map, dead e impact via protocolo MCP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { map } from "../commands/map.js";
import { dead } from "../commands/dead.js";
import { impact } from "../commands/impact.js";
import { suggest } from "../commands/suggest.js";
import { context } from "../commands/context.js";
import { areas } from "../commands/areas.js";
import { area } from "../commands/area.js";
import { areasInit } from "../commands/areas-init.js";
import { VERSION } from "../index.js";
import type { FileCategory } from "../types.js";

/**
 * Cria e configura o servidor MCP
 */
const server = new McpServer({
  name: "ai-tool-mcp-server",
  version: VERSION,
});

// ============================================================================
// TOOL: aitool_project_map
// ============================================================================

server.registerTool(
  "aitool_project_map",
  {
    title: "Project Map",
    description: `Mapeia projeto e retorna resumo: contagens por categoria, areas detectadas, alertas.
Use no inicio da sessao. Para detalhes: area_detail, file_context, suggest_reads.`,
    inputSchema: {
      format: z
        .enum(["text", "json"])
        .default("text")
        .describe("Formato de saida: text (legivel) ou json (estruturado)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Project Map",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      // MCP sempre usa resumo (full: false)
      const result = await map({
        format: params.format,
        cwd: params.cwd,
        full: false,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar map: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_dead_code
// ============================================================================

server.registerTool(
  "aitool_dead_code",
  {
    title: "Dead Code Detector",
    description: `Detecta codigo morto: arquivos orfaos, exports nao usados, deps npm mortas.
Use antes de refatoracoes ou periodicamente para limpeza.`,
    inputSchema: {
      format: z
        .enum(["text", "json"])
        .default("text")
        .describe("Formato de saida: text (legivel) ou json (estruturado)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Dead Code Detector",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await dead({
        format: params.format,
        cwd: params.cwd,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar dead: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_impact_analysis
// ============================================================================

server.registerTool(
  "aitool_impact_analysis",
  {
    title: "Impact Analysis",
    description: `Analisa impacto de modificar um arquivo: upstream (quem importa), downstream (o que importa), riscos.
Use ANTES de editar arquivos para planejar mudancas seguras.`,
    inputSchema: {
      target: z
        .string()
        .min(1)
        .describe(
          "Arquivo a analisar: caminho completo, parcial ou nome do arquivo"
        ),
      format: z
        .enum(["text", "json"])
        .default("text")
        .describe("Formato de saida: text (legivel) ou json (estruturado)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Impact Analysis",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await impact(params.target, {
        format: params.format,
        cwd: params.cwd,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar impact: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_suggest_reads
// ============================================================================

server.registerTool(
  "aitool_suggest_reads",
  {
    title: "Suggest Files to Read",
    description: `Sugere arquivos para ler ANTES de modificar um arquivo.
Prioriza: tipos usados, dependencias diretas, upstream, testes.`,
    inputSchema: {
      target: z
        .string()
        .min(1)
        .describe(
          "Arquivo que sera modificado: caminho completo, parcial ou nome"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Numero maximo de sugestoes (default: 10)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Suggest Files to Read",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await suggest(params.target, {
        limit: params.limit,
        cwd: params.cwd,
        format: "text",
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar suggest: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_file_context
// ============================================================================

server.registerTool(
  "aitool_file_context",
  {
    title: "Extract File Context",
    description: `Extrai assinaturas de funcoes e tipos de um arquivo (sem implementacao).
Use para entender a API publica antes de usar ou modificar.`,
    inputSchema: {
      target: z
        .string()
        .min(1)
        .describe(
          "Arquivo para extrair contexto: caminho completo, parcial ou nome"
        ),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Extract File Context",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await context(params.target, {
        cwd: params.cwd,
        format: "text",
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar context: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_list_areas
// ============================================================================

server.registerTool(
  "aitool_list_areas",
  {
    title: "List Project Areas",
    description: `Lista areas/dominios funcionais do projeto (auth, pets, stripe...).
Diferente de categorias (hook, component). Use area_detail para ver arquivos.`,
    inputSchema: {
      format: z
        .enum(["text", "json"])
        .default("text")
        .describe("Formato de saida: text (legivel) ou json (estruturado)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "List Project Areas",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await areas({
        format: params.format,
        cwd: params.cwd,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar areas: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_area_detail
// ============================================================================

server.registerTool(
  "aitool_area_detail",
  {
    title: "Area Detail",
    description: `Mostra arquivos de uma area especifica, agrupados por categoria.
Parametros: target (nome da area), type (filtrar categoria), full (todos arquivos).`,
    inputSchema: {
      target: z
        .string()
        .min(1)
        .describe("Nome da area: meus-pets, auth, stripe, etc"),
      type: z
        .enum([
          "page",
          "layout",
          "route",
          "component",
          "hook",
          "service",
          "store",
          "util",
          "type",
          "config",
          "test",
          "other",
        ])
        .optional()
        .describe("Filtrar por categoria especifica"),
      full: z
        .boolean()
        .default(false)
        .describe("Mostrar todos os arquivos (default: resumido)"),
      cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
    },
    annotations: {
      title: "Area Detail",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await area(params.target, {
        type: params.type as FileCategory | undefined,
        full: params.full,
        cwd: params.cwd,
        format: "text",
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar area: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// TOOL: aitool_areas_init
// ============================================================================

server.registerTool(
  "aitool_areas_init",
  {
    title: "Initialize Areas Config",
    description: `Gera .analyze/areas.config.json para customizar deteccao de areas.
Use quando houver arquivos sem area ou precisar ajustar deteccao.`,
    inputSchema: {
      force: z
        .boolean()
        .default(false)
        .describe("Sobrescrever config existente"),
      cwd: z.string().optional().describe("Diretorio do projeto"),
    },
    annotations: {
      title: "Initialize Areas Config",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const result = await areasInit({
        force: params.force,
        cwd: params.cwd,
      });
      return { content: [{ type: "text", text: result }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro ao executar areas init: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================

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
