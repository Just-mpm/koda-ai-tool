/**
 * Sistema de dicas contextuais para CLI e MCP
 *
 * Gera instruções de uso corretas dependendo do contexto de execução.
 * - CLI: "ai-tool impact Button"
 * - MCP: "aitool_impact_analysis { target: 'Button' }"
 *
 * Também fornece "próximos passos" contextuais que guiam a IA ou
 * o usuário para a ação mais relevante após cada comando.
 */

/**
 * Contexto de execução: CLI (terminal) ou MCP (protocolo para IAs)
 */
export type HintContext = "cli" | "mcp";

/**
 * Mapeamento de comandos internos para seus formatos CLI e MCP
 */
interface CommandMapping {
  cli: string;
  mcp: string;
}

const COMMAND_MAP: Record<string, CommandMapping> = {
  map: {
    cli: "ai-tool map",
    mcp: "analyze__aitool_project_map",
  },
  dead: {
    cli: "ai-tool dead",
    mcp: "analyze__aitool_dead_code",
  },
  impact: {
    cli: "ai-tool impact <arquivo>",
    mcp: "analyze__aitool_impact_analysis { target: '<arquivo>' }",
  },
  suggest: {
    cli: "ai-tool suggest <arquivo>",
    mcp: "analyze__aitool_suggest_reads { target: '<arquivo>' }",
  },
  context: {
    cli: "ai-tool context <arquivo>",
    mcp: "analyze__aitool_file_context { target: '<arquivo>' }",
  },
  area_context: {
    cli: "ai-tool context --area=<nome>",
    mcp: "analyze__aitool_area_context { area: '<nome>' }",
  },
  areas: {
    cli: "ai-tool areas",
    mcp: "analyze__aitool_list_areas",
  },
  area: {
    cli: "ai-tool area <nome>",
    mcp: "analyze__aitool_area_detail { target: '<nome>' }",
  },
  areas_init: {
    cli: "ai-tool areas init",
    mcp: "analyze__aitool_areas_init",
  },
  find: {
    cli: "ai-tool find <termo>",
    mcp: "analyze__aitool_find { query: '<termo>' }",
  },
  describe: {
    cli: "ai-tool describe <termo>",
    mcp: "analyze__aitool_describe { query: '<termo>' }",
  },
  functions: {
    cli: "ai-tool functions",
    mcp: "analyze__aitool_list_functions",
  },
};

/**
 * Retorna a instrução de uso de um comando no formato correto (CLI ou MCP)
 *
 * @param command - Nome interno do comando (ex: "impact", "suggest")
 * @param ctx - Contexto de execução
 * @param params - Substituições de parâmetros (ex: { "<arquivo>": "Button.tsx" })
 * @returns String de instrução formatada
 */
export function hint(
  command: string,
  ctx: HintContext,
  params?: Record<string, string>
): string {
  const mapping = COMMAND_MAP[command];
  if (!mapping) return command;

  let instruction = mapping[ctx];

  if (params) {
    for (const [placeholder, value] of Object.entries(params)) {
      instruction = instruction.replaceAll(placeholder, value);
    }
  }

  return instruction;
}

/**
 * Definição de um passo sugerido
 */
interface NextStep {
  /** Comando interno (chave do COMMAND_MAP) */
  command: string;
  /** Descrição curta do que o passo faz */
  description: string;
  /** Substituições de parâmetros opcionais */
  params?: Record<string, string>;
}

/**
 * Próximos passos contextuais para cada comando.
 * Cada entrada é uma lista ordenada de ações recomendadas após usar o comando.
 */
const NEXT_STEPS: Record<string, NextStep[]> = {
  map: [
    { command: "area", description: "ver arquivos de uma area" },
    { command: "suggest", description: "o que ler antes de editar" },
    { command: "context", description: "ver API de um arquivo" },
  ],
  impact: [
    { command: "suggest", description: "o que ler antes de editar este arquivo" },
    { command: "context", description: "ver assinaturas dos arquivos upstream" },
    { command: "find", description: "localizar usos de exports especificos" },
  ],
  suggest: [
    { command: "context", description: "ver assinaturas de cada arquivo sugerido" },
    { command: "impact", description: "ver impacto completo da mudanca" },
  ],
  context: [
    { command: "impact", description: "ver quem sera afetado por mudancas" },
    { command: "find", description: "localizar usos de uma funcao ou tipo" },
    { command: "suggest", description: "o que ler antes de editar" },
  ],
  area_context: [
    { command: "find", description: "buscar usos de simbolos desta area" },
    { command: "area", description: "ver lista de arquivos desta area" },
    { command: "impact", description: "ver impacto de modificar um arquivo" },
  ],
  find: [
    { command: "context", description: "ver assinaturas completas do arquivo" },
    { command: "impact", description: "ver impacto de modificar o arquivo" },
    { command: "describe", description: "buscar areas por descricao" },
  ],
  describe: [
    { command: "area", description: "ver detalhes de uma area" },
    { command: "area_context", description: "contexto completo de uma area" },
  ],
  areas: [
    { command: "area", description: "ver arquivos de uma area especifica" },
    { command: "describe", description: "buscar areas por descricao" },
  ],
  area: [
    { command: "area_context", description: "contexto consolidado (tipos, hooks, funcoes)" },
    { command: "context", description: "ver assinaturas de um arquivo especifico" },
    { command: "find", description: "buscar simbolos dentro da area" },
  ],
  dead: [
    { command: "impact", description: "verificar se um arquivo morto e realmente nao usado" },
    { command: "map", description: "ver estrutura atualizada do projeto" },
  ],
  functions: [
    { command: "find", description: "buscar uma Cloud Function especifica" },
    { command: "impact", description: "ver impacto de modificar uma function" },
    { command: "context", description: "ver assinaturas de uma function" },
  ],
};

/**
 * Gera seção de "Próximos passos" formatada para o contexto correto
 *
 * @param command - Comando que acabou de ser executado
 * @param ctx - Contexto de execução (cli ou mcp)
 * @returns String formatada com próximos passos
 */
export function nextSteps(command: string, ctx: HintContext): string {
  const steps = NEXT_STEPS[command];
  if (!steps || steps.length === 0) return "";

  let out = "\n📖 Proximos passos:\n";

  for (const step of steps) {
    const instruction = hint(step.command, ctx);
    out += `   → ${instruction} - ${step.description}\n`;
  }

  return out;
}

/**
 * Gera uma dica de recuperação quando algo dá errado.
 * Sugere a ação mais relevante para o cenário de erro.
 *
 * @param errorType - Tipo de erro ocorrido
 * @param ctx - Contexto de execução
 * @param extra - Informação extra sobre o erro
 * @returns String formatada com dica de recuperação
 */
export type RecoveryErrorType =
  | "file_not_found"
  | "area_not_found"
  | "no_results"
  | "no_firebase"
  | "no_areas_configured"
  | "symbol_not_found"
  | "index_failed"
  | "generic";

export function recoveryHint(
  errorType: RecoveryErrorType,
  ctx: HintContext,
  _extra?: { command?: string }
): string {
  switch (errorType) {
    case "file_not_found":
      return `\n💡 Dicas:\n   → ${hint("map", ctx)} - ver arquivos disponiveis\n   → ${hint("find", ctx)} - buscar por nome de simbolo\n`;

    case "area_not_found":
      return `\n💡 Dicas:\n   → ${hint("areas", ctx)} - listar areas disponiveis\n   → ${hint("describe", ctx)} - buscar areas por descricao\n   → ${hint("areas_init", ctx)} - gerar configuracao de areas\n`;

    case "no_results":
      return `\n💡 Dicas:\n   → ${hint("find", ctx)} - buscar com outro termo\n   → ${hint("describe", ctx)} - buscar areas por descricao\n   → ${hint("map", ctx)} - ver estrutura do projeto\n`;

    case "no_firebase":
      return `\n💡 Este projeto nao usa Firebase. Comandos disponiveis:\n   → ${hint("map", ctx)} - ver estrutura do projeto\n   → ${hint("find", ctx)} - buscar simbolos no codigo\n   → ${hint("areas", ctx)} - listar areas funcionais\n`;

    case "no_areas_configured":
      return `\n💡 Nenhuma area configurada neste projeto.\n   → ${hint("areas_init", ctx)} - gerar arquivo de configuracao\n   → Depois edite .analyze/areas.config.json com as areas do projeto\n   → ${hint("map", ctx)} - ver estrutura do projeto sem areas\n`;

    case "symbol_not_found":
      return `\n💡 Dicas:\n   → Verifique a ortografia do simbolo\n   → Tente buscar parte do nome\n   → ${hint("find", ctx)} - buscar com outro termo\n   → ${hint("describe", ctx)} - buscar areas por descricao\n   → ${hint("map", ctx)} - ver estrutura do projeto\n`;

    case "index_failed":
      return `\n💡 Falha ao indexar o projeto:\n   → Verifique se tsconfig.json existe e esta valido\n   → Verifique se o projeto tem arquivos .ts ou .tsx\n   → ${hint("map", ctx)} - tente ver a estrutura basica primeiro\n`;

    case "generic":
      return `\n💡 Tente:\n   → ${hint("map", ctx)} - verificar estrutura do projeto\n   → Verifique se o caminho (cwd) esta correto\n`;
  }
}
