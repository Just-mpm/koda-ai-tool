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
Retorna contagens por categoria, areas detectadas, framework e alertas.
Para projetos pequenos (<25 arquivos), lista todos os arquivos automaticamente.

Quando usar: primeiro contato com projeto, visao geral rapida, verificar se areas estao configuradas.
NAO use para: ver detalhes de um arquivo especifico (use file_context) ou buscar simbolos (use find).

Workflow: project_map → area_detail (explorar area) → file_context (entender API)`,
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
          ctx: "mcp",
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
      description: `Detecta arquivos orfaos, exports nao usados e dependencias npm mortas.
Se encontrar itens, use impact_analysis para confirmar que realmente nao sao usados.

Quando usar: antes de refatoracoes, limpeza periodica, verificar se um arquivo pode ser removido.
NAO use para: verificar um arquivo especifico (use impact_analysis).`,
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
          ctx: "mcp",
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
      description: `Mostra upstream (quem importa este arquivo), downstream (o que ele importa), riscos e historico Git.

Quando usar: ANTES de editar um arquivo, avaliar risco de mudanca, entender dependencias.
NAO use para: ver a API/assinaturas de um arquivo (use file_context) ou saber o que ler antes de editar (use suggest_reads).

Se o impacto for alto (muitos upstream), considere usar suggest_reads primeiro para planejar.
Workflow: suggest_reads (o que ler) → impact_analysis (quem sera afetado) → file_context (entender APIs)`,
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
          ctx: "mcp",
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
      description: `PRIMEIRA tool a chamar quando vai editar um arquivo.
Retorna lista priorizada de arquivos que voce DEVE ler antes de modificar.
Prioriza: tipos usados (critico), dependencias diretas (importante), upstream (recomendado), testes (opcional).

Quando usar: sempre como PRIMEIRO passo antes de qualquer edicao de arquivo.
NAO use para: entender a API de um arquivo (use file_context) ou ver quem usa um arquivo (use impact_analysis).

Workflow: suggest_reads → file_context (para cada arquivo sugerido) → editar`,
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
          ctx: "mcp",
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
      description: `Extrai assinaturas de funcoes, tipos e constantes de UM arquivo SEM mostrar implementacao.
Use para entender a API publica antes de usar ou modificar um arquivo.

Quando usar: entender a API de UM arquivo especifico, ver tipos/funcoes exportados.
NAO use para: entender uma area/feature inteira (use area_context, que consolida TODOS os arquivos de uma area em uma unica chamada).

Apos entender o contexto, use find para localizar onde cada export e usado no projeto.`,
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
          ctx: "mcp",
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
Requer configuracao manual em .analyze/areas.config.json (use areas_init para gerar o template).

Quando usar: ver todas as areas disponiveis, entender a organizacao do projeto por dominio de negocio.
NAO use para: buscar uma area pelo nome/descricao (use describe) ou ver os arquivos de uma area (use area_detail).`,
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
          ctx: "mcp",
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
Aceita tanto o ID (ex: auth) quanto o nome amigavel (ex: Autenticacao).

Quando usar: ver QUAIS arquivos pertencem a uma area, explorar a estrutura de uma feature.
NAO use para: entender a API/tipos de uma area inteira (use area_context, que extrai assinaturas de TODOS os arquivos).

Workflow: list_areas → area_detail → area_context (para entender o codigo)`,
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
          ctx: "mcp",
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("area_not_found", "mcp");
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
O arquivo gerado e um TEMPLATE que precisa ser editado manualmente pelo usuario.

Quando usar: areas nao estao configuradas, muitos arquivos sem area, precisa ajustar deteccao.
NAO use para: listar areas existentes (use list_areas) ou buscar areas (use describe).`,
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

Quando usar: saber onde um simbolo e definido e usado, verificar adocao de uma funcao/tipo.
NAO use para: buscar areas por descricao em linguagem natural (use describe) ou entender a API completa de um arquivo (use file_context).

Se nao encontrar: tente buscar parte do nome, remover filtros, ou usar describe para buscar areas.`,
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
          ctx: "mcp",
        });
        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const hint = recoveryHint("symbol_not_found", "mcp");
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
      description: `Contexto consolidado de TODA uma area em uma UNICA chamada.
Retorna tipos, hooks, funcoes, componentes, services, stores e triggers da area.
MUITO mais eficiente que chamar file_context em cada arquivo individualmente.

Quando usar: entender a API completa de uma feature/dominio, ver todos os tipos e funcoes de uma area.
NAO use para: ver um unico arquivo (use file_context) ou ver a lista de arquivos sem assinaturas (use area_detail).

Workflow: list_areas → area_detail (ver arquivos) → area_context (entender codigo)`,
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
          ctx: "mcp",
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

Quando usar: ver todas as Cloud Functions do projeto, entender a arquitetura serverless.
NAO use para: buscar uma function especifica pelo nome (use find com type=trigger) ou ver o codigo de uma function (use file_context).

Se nenhuma function for detectada: verifique se o projeto tem .firebaserc e functions/src/index.ts.`,
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
          ctx: "mcp",
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

Quando usar: nao sabe o ID exato da area, buscar por conceito/descricao, explorar areas por tema.
NAO use para: buscar simbolos no codigo (use find) ou listar todas as areas (use list_areas).

Se nao encontrar: tente termos diferentes, use list_areas para ver areas disponiveis, ou areas_init se nao ha config.`,
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
          ctx: "mcp",
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
