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
import { VERSION } from "../index.js";

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
    description: `Gera um mapa completo do projeto com categorias de arquivos e estrutura de pastas.

FUNCIONALIDADES:
- Lista todos os arquivos TypeScript/JavaScript do projeto
- Categoriza automaticamente: page, layout, route, component, hook, service, store, util, type, config, test
- Agrupa estatisticas por pasta
- Detecta dependencias circulares

PARAMETROS:
- format: "text" (legivel) ou "json" (estruturado)
- cwd: Diretorio do projeto (default: diretorio atual)

RETORNA:
- Sumario com total de arquivos e pastas
- Distribuicao por categoria
- Lista de pastas com contagem
- Lista de arquivos com categoria
- Dependencias circulares detectadas

EXEMPLO DE USO:
Chamar para entender a estrutura de um projeto antes de modificar.`,
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
      const result = await map({
        format: params.format,
        cwd: params.cwd,
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
    description: `Detecta codigo morto no projeto usando Knip.

DETECTA:
- Arquivos orfaos (nao importados por ninguem)
- Exports nao utilizados
- Dependencias npm nao usadas

PARAMETROS:
- format: "text" (legivel) ou "json" (estruturado)
- cwd: Diretorio do projeto (default: diretorio atual)

RETORNA:
- Sumario com total de codigo morto por tipo
- Lista de arquivos orfaos com categoria
- Lista de exports nao usados (arquivo + nome)
- Lista de dependencias npm nao usadas

EXEMPLO DE USO:
Chamar periodicamente para manter o projeto limpo.
Chamar antes de refatoracoes para identificar codigo removivel.

NOTA: Requer que o projeto tenha knip configurado ou use defaults.`,
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
    description: `Analisa o impacto de modificar um arquivo especifico.

ANALISA:
- UPSTREAM: Quem importa este arquivo (direto e indireto)
- DOWNSTREAM: O que este arquivo importa (direto e indireto)
- RISCOS: Arquivo critico, dependencias circulares, cadeia profunda
- SUGESTOES: O que verificar antes de modificar

PARAMETROS:
- target: Nome ou caminho do arquivo a analisar (obrigatorio)
- format: "text" (legivel) ou "json" (estruturado)
- cwd: Diretorio do projeto (default: diretorio atual)

O TARGET pode ser:
- Caminho completo: "src/components/Button.tsx"
- Caminho parcial: "components/Button"
- Nome do arquivo: "Button"

RETORNA:
- Categoria do arquivo target
- Lista de arquivos upstream (quem importa)
- Lista de arquivos downstream (o que importa)
- Alertas de risco com severidade
- Sugestoes de como proceder

EXEMPLO DE USO:
Chamar ANTES de modificar um arquivo para entender o impacto.
Usar para planejar refatoracoes seguras.`,
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
    description: `Sugere arquivos que devem ser lidos ANTES de modificar um arquivo especifico.

PRIORIZA (nesta ordem):
1. CRITICAL: Arquivos de tipos/interfaces usados pelo target
2. HIGH: Dependencias diretas (arquivos importados pelo target)
3. MEDIUM: Upstream (arquivos que importam o target)
4. LOW: Testes relacionados

PARAMETROS:
- target: Nome ou caminho do arquivo que sera modificado (obrigatorio)
- limit: Numero maximo de sugestoes (default: 10, max: 50)
- cwd: Diretorio do projeto (default: diretorio atual)

O TARGET pode ser:
- Caminho completo: "src/components/Button.tsx"
- Caminho parcial: "components/Button"
- Nome do arquivo: "Button"

RETORNA:
- Lista ordenada de arquivos para ler
- Cada sugestao tem: path, categoria, razao, prioridade

EXEMPLO DE USO:
Chamar ANTES de modificar um arquivo para saber o que ler primeiro.
Util para entender o contexto completo antes de fazer mudancas.`,
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
    description: `Extrai assinaturas de funcoes e tipos de um arquivo SEM a implementacao.

EXTRAI:
- IMPORTS: Todos os imports com specifiers e se sao type-only
- EXPORTS: Lista de tudo que e exportado
- FUNCOES: Nome, parametros (com tipos), retorno, async, arrow, JSDoc
- TIPOS: Interfaces, types e enums com suas definicoes completas

NAO INCLUI:
- Corpo das funcoes (implementacao)
- Logica interna
- Comentarios inline

PARAMETROS:
- target: Nome ou caminho do arquivo (obrigatorio)
- cwd: Diretorio do projeto (default: diretorio atual)

O TARGET pode ser:
- Caminho completo: "src/components/Button.tsx"
- Caminho parcial: "components/Button"
- Nome do arquivo: "Button"

RETORNA:
- Arquivo com categoria detectada
- Lista de imports estruturada
- Lista de exports
- Lista de funcoes com assinaturas completas
- Lista de tipos com definicoes

EXEMPLO DE USO:
Chamar para entender a API publica de um arquivo antes de usa-lo.
Util para saber quais funcoes/tipos um arquivo exporta.
Eficiente: retorna apenas assinaturas, nao o codigo completo.`,
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
