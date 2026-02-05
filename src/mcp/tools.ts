/**
 * Registro de todas as ferramentas MCP
 *
 * Este módulo contém a lógica de registro de todas as ferramentas
 * expostas pelo servidor MCP do ai-tool.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { map } from "../commands/map.js";
import { dead } from "../commands/dead.js";
import { impact } from "../commands/impact.js";
import { suggest } from "../commands/suggest.js";
import { context, areaContext } from "../commands/context.js";
import { areas } from "../commands/areas.js";
import { area } from "../commands/area.js";
import { areasInit } from "../commands/areas-init.js";
import { find } from "../commands/find.js";
import { functions } from "../commands/functions.js";
import { describe } from "../commands/describe.js";

/**
 * Registra todas as ferramentas MCP no servidor
 *
 * @param server - Instância do servidor MCP
 */
export function registerAllTools(server: McpServer): void {
  // ============================================================================
  // TOOL: aitool_project_map
  // ============================================================================

  server.registerTool(
    "aitool_project_map",
    {
      title: "Project Map",
      description: `Mapeia projeto e retorna resumo: contagens por categoria, areas detectadas, alertas.
Use no inicio da sessao. Para detalhes: area_detail, file_context, suggest_reads.

Parametros:
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
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
        const result = await map({
          format: params.format,
          cwd: params.cwd,
          full: false,
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar map: ${error instanceof Error ? error.message : String(error)}` }],
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
Use antes de refatoracoes ou periodicamente para limpeza.

Parametros:
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
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
          content: [{ type: "text", text: `Erro ao executar dead: ${error instanceof Error ? error.message : String(error)}` }],
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
Use ANTES de editar arquivos para planejar mudancas seguras.

Parametros:
- target: Arquivo a analisar (caminho completo, parcial ou nome)
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        target: z.string().min(1).describe("Arquivo a analisar: caminho completo, parcial ou nome do arquivo"),
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
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
          content: [{ type: "text", text: `Erro ao executar impact: ${error instanceof Error ? error.message : String(error)}` }],
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
Prioriza: tipos usados, dependencias diretas, upstream, testes.

Parametros:
- target: Arquivo que sera modificado (caminho completo, parcial ou nome)
- limit: Numero maximo de sugestoes (default: 10, max: 50)`,
      inputSchema: {
        target: z.string().min(1).describe("Arquivo que sera modificado: caminho completo, parcial ou nome"),
        limit: z.number().int().min(1).max(50).default(10).describe("Numero maximo de sugestoes (default: 10, max: 50)"),
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
          content: [{ type: "text", text: `Erro ao executar suggest: ${error instanceof Error ? error.message : String(error)}` }],
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
Use para entender a API publica antes de usar ou modificar.

Parametros:
- target: Arquivo para extrair contexto (caminho completo, parcial ou nome)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        target: z.string().min(1).describe("Arquivo para extrair contexto: caminho completo, parcial ou nome"),
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
          content: [{ type: "text", text: `Erro ao executar context: ${error instanceof Error ? error.message : String(error)}` }],
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
Diferente de categorias (hook, component). Use area_detail para ver arquivos.

Parametros:
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
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
          content: [{ type: "text", text: `Erro ao executar areas: ${error instanceof Error ? error.message : String(error)}` }],
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
Use ID (ex: auth) ou Name (ex: Autenticação) para identificar a area.

Parametros:
- target: Nome da area (ex: auth, dashboard, billing)
- type: Filtrar por categoria (page, component, hook, service, etc)
- full: Mostrar todos os arquivos (default: resumido)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        target: z.string().min(1).describe("Nome da area: auth, dashboard, billing, etc"),
        type: z.enum(["page", "layout", "route", "component", "hook", "service", "store", "util", "type", "config", "test", "other"]).optional().describe("Filtrar por categoria especifica"),
        full: z.boolean().default(false).describe("Mostrar todos os arquivos (default: resumido)"),
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
          type: params.type,
          full: params.full,
          cwd: params.cwd,
          format: "text",
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar area: ${error instanceof Error ? error.message : String(error)}` }],
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
Use quando houver arquivos sem area ou precisar ajustar deteccao.

Parametros:
- force: Sobrescrever config existente
- cwd: Diretorio do projeto`,
      inputSchema: {
        force: z.boolean().default(false).describe("Sobrescrever config existente"),
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
          content: [{ type: "text", text: `Erro ao executar areas init: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL: aitool_find
  // ============================================================================

  server.registerTool(
    "aitool_find",
    {
      title: "Find Symbol",
      description: `Busca simbolos no codigo: funcoes, tipos, componentes, hooks, constantes.
Retorna definicao + referencias/usos. Diferente de grep, entende o AST do TypeScript.

Parametros:
- query: Termo a buscar (ex: useAuth, User, login)
- type: Filtrar por tipo (function, type, const, component, hook, trigger, all)
- area: Buscar apenas em uma area especifica (ex: auth, dashboard)
- def: Mostrar apenas definicoes (onde e declarado)
- refs: Mostrar apenas referencias/usos`,
      inputSchema: {
        query: z.string().min(1).describe("Termo a buscar (nome de funcao, tipo, componente, etc)"),
        type: z.enum(["function", "type", "const", "component", "hook", "trigger", "all"]).default("all").describe("Filtrar por tipo de simbolo (use trigger para Cloud Functions)"),
        area: z.string().optional().describe("Filtrar busca por area especifica (ex: auth, dashboard)"),
        def: z.boolean().default(false).describe("Mostrar apenas definicoes (onde e declarado)"),
        refs: z.boolean().default(false).describe("Mostrar apenas referencias (onde e usado)"),
        cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
      },
      annotations: {
        title: "Find Symbol",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await find(params.query, {
          type: params.type,
          area: params.area,
          def: params.def,
          refs: params.refs,
          cwd: params.cwd,
          format: "text",
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar find: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL: aitool_area_context
  // ============================================================================

  server.registerTool(
    "aitool_area_context",
    {
      title: "Area Context",
      description: `Contexto consolidado de toda uma area: tipos, hooks, funcoes, componentes, services, stores.
Uma chamada = entender toda a feature. Muito mais eficiente que chamar context em cada arquivo.

Parametros:
- area: Nome da area (ex: auth, dashboard, payments)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        area: z.string().min(1).describe("Nome da area: auth, dashboard, payments, etc"),
        cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
      },
      annotations: {
        title: "Area Context",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await areaContext(params.area, {
          cwd: params.cwd,
          format: "text",
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar area context: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL: aitool_list_functions
  // ============================================================================

  server.registerTool(
    "aitool_list_functions",
    {
      title: "List Cloud Functions",
      description: `Lista todas as Cloud Functions Firebase do projeto.
Agrupa por tipo de trigger (onCall, onDocumentCreated, onSchedule, etc).
Use para entender a arquitetura serverless antes de modificar triggers.

Parametros:
- trigger: Filtrar por tipo de trigger (ex: onCall, onDocumentCreated, onSchedule)
- format: text (legivel) ou json (estruturado)`,
      inputSchema: {
        trigger: z.string().optional().describe("Filtrar por tipo de trigger (ex: onCall, onDocumentCreated, onSchedule)"),
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
        cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
      },
      annotations: {
        title: "List Cloud Functions",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await functions({
          format: params.format,
          trigger: params.trigger,
          cwd: params.cwd,
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar functions: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ============================================================================
  // TOOL: aitool_describe
  // ============================================================================

  server.registerTool(
    "aitool_describe",
    {
      title: "Search by Description",
      description: `Busca áreas por descrição em linguagem natural.
Ex: "Onde implementou login?" → encontra área de autenticação.

Parametros:
- query: Descrição ou keyword
- cwd: Diretorio do projeto`,
      inputSchema: {
        query: z.string().min(1).describe("Descrição ou keyword para buscar áreas"),
        format: z.enum(["text", "json"]).default("text").describe("Formato de saida: text (legivel) ou json (estruturado)"),
        cwd: z.string().optional().describe("Diretorio do projeto a analisar"),
      },
      annotations: {
        title: "Search by Description",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const result = await describe(params.query, {
          format: params.format,
          cwd: params.cwd,
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Erro ao executar describe: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
