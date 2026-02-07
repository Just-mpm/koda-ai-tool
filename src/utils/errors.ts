/**
 * Formatadores de mensagens de erro com sugestoes inteligentes
 *
 * Todas as funcoes recebem um parametro `ctx` (HintContext)
 * que determina o formato das dicas de navegacao:
 * - "cli": instrucoes no formato CLI (ex: "ai-tool impact Button")
 * - "mcp": instrucoes no formato MCP (ex: "analyze__aitool_impact_analysis { target: 'Button' }")
 */

import { findSimilar, findBestMatch, extractFileName } from "./similarity.js";
import { hint, type HintContext } from "./hints.js";

/**
 * Referencia rapida de comandos disponiveis
 */
const COMMAND_REFERENCE_KEYS = ["map", "areas", "area", "suggest", "context", "impact", "dead", "find", "describe"] as const;

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  map: "Resumo do projeto",
  areas: "Listar todas as areas",
  area: "Arquivos de uma area especifica",
  suggest: "O que ler antes de editar",
  context: "API/assinaturas de um arquivo",
  impact: "Quem usa este arquivo",
  dead: "Codigo morto",
  find: "Buscar simbolos no codigo",
  describe: "Buscar areas por descricao",
};

/**
 * Gera secao de referencia de comandos usando hint()
 */
function getCommandReferenceSection(ctx: HintContext, excludeCommand?: string): string {
  let out = `\n📌 Comandos uteis:\n`;

  for (const cmd of COMMAND_REFERENCE_KEYS) {
    if (cmd !== excludeCommand) {
      const desc = COMMAND_DESCRIPTIONS[cmd];
      out += `   → ${hint(cmd, ctx)} - ${desc}\n`;
    }
  }

  return out;
}

// ============================================================================
// FILE NOT FOUND
// ============================================================================

export interface FormatFileNotFoundOptions {
  /** Termo buscado */
  target: string;
  /** Lista de todos os arquivos disponiveis */
  allFiles: string[];
  /** Comando que gerou o erro (para contexto) */
  command?: string;
  /** Contexto de execucao */
  ctx?: HintContext;
}

/**
 * Formata mensagem de arquivo nao encontrado
 *
 * Inclui sugestoes de arquivos similares e referencia de comandos.
 */
export function formatFileNotFound(options: FormatFileNotFoundOptions): string {
  const { target, allFiles, command, ctx = "cli" } = options;

  // Encontra arquivos similares
  const similarFiles = findSimilar(target, allFiles, {
    maxDistance: 3,
    limit: 5,
    extractKey: extractFileName,
  });

  // Encontra melhor sugestao
  const bestMatch = findBestMatch(target, allFiles, extractFileName);

  let out = `\n❌ Arquivo nao encontrado: "${target}"\n\n`;
  out += `📊 Total de arquivos indexados: ${allFiles.length}\n\n`;

  // "Voce quis dizer?" se houver match confiavel
  if (bestMatch && command) {
    out += `💡 Voce quis dizer?\n`;
    out += `   → ${hint(command, ctx, { "<arquivo>": bestMatch, "<termo>": bestMatch })}\n\n`;
  } else if (bestMatch) {
    out += `💡 Voce quis dizer?\n`;
    out += `   → ${bestMatch}\n\n`;
  }

  // Lista de arquivos similares (se houver mais que o bestMatch)
  if (similarFiles.length > 1) {
    out += `📝 Arquivos similares:\n`;
    for (const f of similarFiles) {
      if (f !== bestMatch) {
        out += `   • ${f}\n`;
      }
    }
    out += "\n";
  }

  // Dicas contextuais
  out += `📖 Dicas:\n`;
  out += `   • Use o caminho relativo: src/components/Header.tsx\n`;
  out += `   • Ou apenas o nome do arquivo: Header\n`;
  out += `   • Verifique se o arquivo esta em uma pasta incluida no scan\n`;

  // Referencia de comandos
  if (command) {
    out += getCommandReferenceSection(ctx, command);
  }

  return out;
}

// ============================================================================
// AREA NOT FOUND
// ============================================================================

export interface AreaInfo {
  /** ID da area */
  id: string;
  /** Numero de arquivos na area */
  count: number;
}

export interface FormatAreaNotFoundOptions {
  /** Termo buscado */
  target: string;
  /** Lista de areas disponiveis */
  availableAreas: AreaInfo[];
  /** Contexto de execucao */
  ctx?: HintContext;
}

/**
 * Formata mensagem de area nao encontrada
 *
 * Inclui sugestoes de areas similares usando Levenshtein.
 */
export function formatAreaNotFound(options: FormatAreaNotFoundOptions): string {
  const { target, availableAreas, ctx = "cli" } = options;

  // Extrai IDs para comparacao
  const areaIds = availableAreas.map((a) => a.id);

  // Encontra melhor sugestao (case-insensitive)
  const bestMatchId = findBestMatch(target, areaIds);

  // Encontra areas similares
  const similarAreaIds = findSimilar(target, areaIds, {
    maxDistance: 3,
    limit: 5,
  });

  let out = `\n❌ Area nao encontrada: "${target}"\n\n`;

  // "Voce quis dizer?" se houver match confiavel
  if (bestMatchId) {
    out += `💡 Voce quis dizer?\n`;
    out += `   → ${hint("area", ctx, { "<nome>": bestMatchId })}\n\n`;
  }

  // Areas disponiveis (prioriza similares se houver)
  if (availableAreas.length > 0) {
    out += `📦 Areas disponiveis:\n\n`;

    // Se tem similares, mostra elas primeiro
    if (similarAreaIds.length > 0 && !bestMatchId) {
      for (const id of similarAreaIds) {
        const area = availableAreas.find((a) => a.id === id);
        if (area) {
          out += `   ${area.id.padEnd(25)} ${area.count} arquivos\n`;
        }
      }
      out += `   ---\n`;
    }

    // Mostra as demais (ou todas se nao houver similares)
    const areasToShow =
      similarAreaIds.length > 0 && !bestMatchId
        ? availableAreas.filter((a) => !similarAreaIds.includes(a.id)).slice(0, 10)
        : availableAreas.slice(0, 15);

    for (const { id, count } of areasToShow) {
      out += `   ${id.padEnd(25)} ${count} arquivos\n`;
    }

    const totalShown = similarAreaIds.length > 0 && !bestMatchId ? similarAreaIds.length + areasToShow.length : areasToShow.length;

    if (availableAreas.length > totalShown) {
      out += `   ... e mais ${availableAreas.length - totalShown}\n`;
    }
    out += `\n`;
  }

  // Dicas
  out += `📖 Dicas:\n`;
  out += `   → ${hint("areas", ctx)} - listar todas as areas\n`;
  out += `   → ${hint("describe", ctx)} - buscar areas por descricao\n`;
  out += `   → IDs sao case-sensitive (Auth ≠ auth)\n`;

  return out;
}

// ============================================================================
// MISSING TARGET
// ============================================================================

/**
 * Formata mensagem de target obrigatorio faltando
 */
export function formatMissingTarget(command: string, ctx: HintContext = "cli"): string {
  let out = `\n❌ Erro: parametro "target" e OBRIGATORIO para o comando "${command}".\n\n`;

  out += `📝 Exemplos:\n`;

  if (command === "area") {
    out += `   ${hint("area", ctx, { "<nome>": "auth" })}\n`;
    out += `   ${hint("area", ctx, { "<nome>": "dashboard" })}\n\n`;
    out += `💡 ${hint("areas", ctx)} - listar todas as areas disponiveis\n`;
  } else {
    out += `   ${hint(command, ctx, { "<arquivo>": "useAuth", "<termo>": "useAuth" })}\n`;
    out += `   ${hint(command, ctx, { "<arquivo>": "Button.tsx", "<termo>": "Button" })}\n`;
  }

  out += getCommandReferenceSection(ctx, command);

  return out;
}

// ============================================================================
// INVALID COMMAND
// ============================================================================

/**
 * Formata mensagem de comando invalido
 */
export function formatInvalidCommand(command: string, ctx: HintContext = "cli"): string {
  const validCommands = Object.keys(COMMAND_DESCRIPTIONS);
  const bestMatch = findBestMatch(command, validCommands);

  let out = `\n❌ Comando invalido: "${command}"\n\n`;

  if (bestMatch) {
    out += `💡 Voce quis dizer?\n`;
    out += `   → ${hint(bestMatch, ctx)}\n\n`;
  }

  out += `📌 Comandos disponiveis:\n`;
  for (const cmd of COMMAND_REFERENCE_KEYS) {
    const desc = COMMAND_DESCRIPTIONS[cmd];
    out += `   → ${hint(cmd, ctx)} - ${desc}\n`;
  }

  return out;
}
