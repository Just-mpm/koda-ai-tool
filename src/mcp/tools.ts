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
import { recoveryHint } from "../utils/hints.js";

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
      description: `Use no inicio da sessao para entender a estrutura do projeto.
Retorna contagens por categoria, areas detectadas e alertas.

Workflow: project_map → area_detail (explorar area) → file_context (entender API)

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("generic", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar map: ${msg}\n${hint}` }],
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
      description: `Use antes de refatoracoes ou periodicamente para encontrar codigo nao utilizado.
Detecta arquivos orfaos, exports nao usados e dependencias npm mortas.
Se encontrar itens, use impact_analysis para confirmar que realmente nao sao usados.

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("generic", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar dead: ${msg}\n${hint}` }],
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
      description: `Use ANTES de editar um arquivo para saber quem sera afetado pela mudanca.
Mostra upstream (quem importa este arquivo), downstream (o que ele importa), riscos e historico Git.

Workflow: suggest_reads (o que ler) → impact_analysis (quem sera afetado) → file_context (entender APIs)

Se o impacto for alto (muitos upstream), considere usar suggest_reads primeiro para planejar.

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("file_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar impact: ${msg}\n${hint}` }],
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
      description: `Primeira tool a chamar quando vai editar um arquivo.
Retorna lista priorizada de arquivos que voce DEVE ler antes de modificar.
Prioriza: tipos usados (critico), dependencias diretas (importante), upstream (recomendado), testes (opcional).

Workflow: suggest_reads → file_context (para cada arquivo sugerido) → editar

Parametros:
- target: Arquivo que sera modificado (caminho completo, parcial ou nome)
- limit: Numero maximo de sugestoes (default: 10, max: 50)
- cwd: Diretorio do projeto a analisar`,
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("file_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar suggest: ${msg}\n${hint}` }],
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
      description: `Extrai assinaturas de funcoes, tipos e constantes de um arquivo SEM mostrar implementacao.
Use para entender a API publica antes de usar ou modificar um arquivo.

Apos entender o contexto, use find para localizar onde cada export e usado no projeto.

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("file_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar context: ${msg}\n${hint}` }],
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
      description: `Lista areas/dominios funcionais do projeto (auth, pets, stripe, dashboard...).
Areas sao diferentes de categorias (hook, component, page).
Requer configuracao em .analyze/areas.config.json (use areas_init para gerar).

Se nao encontrar areas, use areas_init para gerar a configuracao.
Use area_detail para ver os arquivos de uma area especifica.

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("generic", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar areas: ${msg}\n${hint}` }],
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
      description: `Mostra todos os arquivos de uma area especifica, agrupados por categoria.
Use apos list_areas para explorar uma area de interesse.
Aceita tanto o ID (ex: auth) quanto o nome amigavel (ex: Autenticacao).

Apos ver os arquivos, use area_context para obter contexto consolidado (tipos, hooks, funcoes).

Parametros:
- target: Nome ou ID da area (ex: auth, dashboard, billing)
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("file_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar area: ${msg}\n${hint}` }],
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
      description: `Gera .analyze/areas.config.json com template baseado no framework detectado.
Use quando: (1) areas nao estao configuradas, (2) muitos arquivos sem area, (3) precisa ajustar deteccao.

O arquivo gerado e um template que precisa ser editado manualmente pelo usuario.

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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("generic", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar areas init: ${msg}\n${hint}` }],
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
      description: `Busca simbolos no codigo usando AST TypeScript (mais preciso que grep).
Encontra funcoes, tipos, componentes, hooks, constantes e Cloud Functions.
Retorna definicao (onde foi declarado) + referencias (onde e importado/usado).

Se nao encontrar, tente: buscar parte do nome, remover filtros, ou usar describe para buscar por descricao.

Parametros:
- query: Termo a buscar (ex: useAuth, User, handleSubmit)
- type: Filtrar por tipo (function, type, const, component, hook, trigger, all)
- area: Buscar apenas em uma area especifica (ex: auth, dashboard)
- def: Mostrar apenas definicoes (onde e declarado)
- refs: Mostrar apenas referencias/usos
- cwd: Diretorio do projeto a analisar`,
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("area_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar find: ${msg}\n${hint}` }],
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
      description: `Contexto consolidado de TODA uma area em uma unica chamada.
Retorna tipos, hooks, funcoes, componentes, services, stores e triggers da area.
Muito mais eficiente que chamar file_context em cada arquivo individualmente.

Use apos area_detail para entender a API completa de uma feature.

Parametros:
- area: Nome ou ID da area (ex: auth, dashboard, payments)
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("area_not_found", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar area context: ${msg}\n${hint}` }],
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
      description: `Lista todas as Cloud Functions Firebase do projeto, agrupadas por trigger.
Detecta: onCall, onDocumentCreated, onSchedule, onRequest e outros triggers v2.

Se nenhuma function for detectada, verifique: (1) projeto tem .firebaserc, (2) existe functions/src/index.ts, (3) tente com cache desabilitado.

Parametros:
- trigger: Filtrar por tipo de trigger (ex: onCall, onDocumentCreated, onSchedule)
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("no_firebase", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar functions: ${msg}\n${hint}` }],
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
      description: `Busca areas por descricao em linguagem natural.
Exemplo: "login" encontra a area de autenticacao, "pagamento" encontra a area de billing.
Usa keywords + correcao via Levenshtein para tolerancia a erros de digitacao.

Se nao encontrar, tente: termos diferentes, usar list_areas para ver areas disponiveis, ou areas_init se nao ha config.

Parametros:
- query: Descricao ou keyword para buscar areas
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto a analisar`,
      inputSchema: {
        query: z.string().min(1).describe("Descricao ou keyword para buscar areas"),
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
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("generic", "mcp");
        return {
          content: [{ type: "text", text: `Erro ao executar describe: ${msg}\n${hint}` }],
          isError: true,
        };
      }
    }
  );
}
