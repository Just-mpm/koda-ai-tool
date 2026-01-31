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
// TOOL: aitool_list_areas
// ============================================================================

server.registerTool(
  "aitool_list_areas",
  {
    title: "List Project Areas",
    description: `Lista todas as areas/dominios funcionais do projeto.

IMPORTANTE - AREAS vs CATEGORIAS:
- CATEGORIA = tipo tecnico (hook, component, page, service...)
  → Use aitool_project_map para ver categorias
- AREA = dominio funcional (auth, meus-pets, stripe, dashboard...)
  → Use ESTA tool para ver areas
  → Use aitool_area_detail para ver arquivos de uma area especifica

Um arquivo pode pertencer a MULTIPLAS areas!

FUNCIONALIDADES:
- Detecta areas automaticamente baseado em padroes de pasta e keywords
- Agrupa arquivos por dominio funcional
- Mostra distribuicao de categorias por area
- Identifica arquivos sem area definida

PARAMETROS:
- format: "text" (legivel) ou "json" (estruturado)
- cwd: Diretorio do projeto (default: diretorio atual)

RETORNA:
- Lista de areas com nome, descricao e contagem
- Distribuicao de categorias por area
- Lista de arquivos sem area (para configurar manualmente)

EXEMPLO DE USO:
Chamar no inicio da sessao para entender os dominios do projeto.
Usar antes de trabalhar em uma feature especifica.

CONFIGURACAO MANUAL:
Se houver arquivos sem area ou areas incorretas, use aitool_areas_init
para gerar .analyze/areas.config.json e edite manualmente.`,
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
    description: `Mostra todos os arquivos de uma area/dominio especifica.

USE ESTA TOOL QUANDO:
- Usuario pedir para trabalhar em uma feature (ex: "vou mexer em auth")
- Precisar listar todos os arquivos de um dominio
- Quiser ver apenas hooks, components, etc de uma area especifica

FUNCIONALIDADES:
- Lista arquivos agrupados por categoria (page, component, hook...)
- Mostra descricao de cada arquivo (inferida ou manual)
- Permite filtrar por categoria especifica (type="hook")
- Mostra resumo de distribuicao

PARAMETROS:
- target: Nome da area (OBRIGATORIO - ex: "meus-pets", "auth", "stripe")
- type: Filtrar por categoria (opcional - ex: "hook", "component")
- full: Mostrar todos os arquivos (default: false = resumido)
- cwd: Diretorio do projeto

RETORNA:
- Nome e descricao da area
- Lista de arquivos por categoria
- Descricao de cada arquivo

EXEMPLOS DE USO:
- Ver tudo de auth: target="auth"
- Ver apenas hooks de auth: target="auth", type="hook"
- Ver todos os arquivos de stripe: target="stripe", full=true

DICA: Use aitool_list_areas primeiro para ver quais areas existem.`,
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
    description: `Gera arquivo de configuracao de areas (.analyze/areas.config.json).

QUANDO USAR:
- Quando aitool_list_areas mostrar arquivos sem area definida
- Quando precisar personalizar deteccao de areas
- Quando quiser adicionar areas que nao sao detectadas automaticamente

O QUE FAZ:
- Escaneia o projeto e detecta areas automaticamente
- Infere patterns glob para cada area detectada
- Gera arquivo editavel em .analyze/areas.config.json
- NAO sobrescreve config existente (use force=true para sobrescrever)

PARAMETROS:
- force: Sobrescrever config existente (default: false)
- cwd: Diretorio do projeto (default: diretorio atual)

RETORNA:
- Confirmacao do arquivo criado
- Lista de areas detectadas com contagem
- Arquivos sem area (para configurar manualmente)
- Instrucoes de como editar o arquivo

ESTRUTURA DO ARQUIVO GERADO:
{
  "areas": {
    "auth": {
      "name": "Autenticacao",
      "description": "Sistema de login e sessao",
      "patterns": ["components/auth/**", "hooks/useAuth.ts"],
      "keywords": ["auth", "login", "session"]
    }
  },
  "descriptions": {
    "components/pets/PetForm.tsx": "Formulario multi-step de pets"
  },
  "settings": {
    "autoDetect": true,
    "inferDescriptions": true
  }
}

COMO EDITAR MANUALMENTE:
1. Adicionar areas nao detectadas: adicione entrada em "areas"
2. Renomear areas: altere "name" da area
3. Ajustar deteccao: modifique "patterns" e "keywords"
4. Excluir arquivos: adicione "exclude" com patterns
5. Descrever arquivos: adicione entrada em "descriptions"

EXEMPLO DE USO:
1. Rode aitool_list_areas para ver areas atuais
2. Se houver arquivos sem area, rode aitool_areas_init
3. Edite .analyze/areas.config.json conforme necessario
4. Rode aitool_list_areas novamente para ver mudancas`,
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
