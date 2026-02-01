/**
 * Formatadores de mensagens de erro com sugestões inteligentes
 *
 * Todas as funções retornam strings formatadas para exibição,
 * com sugestões "você quis dizer?" e referência de comandos.
 */

import { findSimilar, findBestMatch, extractFileName } from "./similarity.js";

/**
 * Referência rápida de comandos disponíveis
 */
export const COMMAND_REFERENCE: Record<string, string> = {
  map: "Resumo do projeto (sem target)",
  areas: "Listar todas as áreas (sem target)",
  area: "Arquivos de uma área específica",
  suggest: "O que ler antes de editar",
  context: "API/assinaturas de um arquivo",
  impact: "Quem usa este arquivo",
  dead: "Código morto (sem target)",
};

/**
 * Gera seção de referência de comandos
 */
function getCommandReferenceSection(excludeCommand?: string): string {
  let out = `\n📌 Comandos úteis:\n`;

  for (const [cmd, desc] of Object.entries(COMMAND_REFERENCE)) {
    if (cmd !== excludeCommand) {
      out += `   ai-tool ${cmd.padEnd(10)} ${desc}\n`;
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
  /** Lista de todos os arquivos disponíveis */
  allFiles: string[];
  /** Comando que gerou o erro (para contexto) */
  command?: string;
}

/**
 * Formata mensagem de arquivo não encontrado
 *
 * Inclui sugestões de arquivos similares e referência de comandos.
 */
export function formatFileNotFound(options: FormatFileNotFoundOptions): string {
  const { target, allFiles, command } = options;

  // Encontra arquivos similares
  const similarFiles = findSimilar(target, allFiles, {
    maxDistance: 3,
    limit: 5,
    extractKey: extractFileName,
  });

  // Encontra melhor sugestão
  const bestMatch = findBestMatch(target, allFiles, extractFileName);

  let out = `\n❌ Arquivo não encontrado: "${target}"\n\n`;
  out += `📊 Total de arquivos indexados: ${allFiles.length}\n\n`;

  // "Você quis dizer?" se houver match confiável
  if (bestMatch) {
    out += `💡 Você quis dizer?\n`;
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
  out += `   • Verifique se o arquivo está em uma pasta incluída no scan\n`;

  // Referência de comandos
  if (command) {
    out += getCommandReferenceSection(command);
  }

  return out;
}

// ============================================================================
// AREA NOT FOUND
// ============================================================================

export interface AreaInfo {
  /** ID da área */
  id: string;
  /** Número de arquivos na área */
  count: number;
}

export interface FormatAreaNotFoundOptions {
  /** Termo buscado */
  target: string;
  /** Lista de áreas disponíveis */
  availableAreas: AreaInfo[];
}

/**
 * Formata mensagem de área não encontrada
 *
 * Inclui sugestões de áreas similares usando Levenshtein.
 */
export function formatAreaNotFound(options: FormatAreaNotFoundOptions): string {
  const { target, availableAreas } = options;

  // Extrai IDs para comparação
  const areaIds = availableAreas.map((a) => a.id);

  // Encontra melhor sugestão (case-insensitive)
  const bestMatchId = findBestMatch(target, areaIds);

  // Encontra áreas similares
  const similarAreaIds = findSimilar(target, areaIds, {
    maxDistance: 3,
    limit: 5,
  });

  let out = `\n❌ Área não encontrada: "${target}"\n\n`;

  // "Você quis dizer?" se houver match confiável
  if (bestMatchId) {
    out += `💡 Você quis dizer?\n`;
    out += `   → ai-tool area ${bestMatchId}\n\n`;
  }

  // Áreas disponíveis (prioriza similares se houver)
  if (availableAreas.length > 0) {
    out += `📦 Áreas disponíveis:\n\n`;

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

    // Mostra as demais (ou todas se não houver similares)
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
  out += `   • Use o ID exato da área (ex: ai-tool area auth)\n`;
  out += `   • Use 'ai-tool areas' para listar todas as áreas\n`;
  out += `   • IDs são case-sensitive (Auth ≠ auth)\n`;

  // Referência de comandos relacionados
  out += `\n📌 Comandos relacionados:\n`;
  out += `   ai-tool areas      Listar todas as áreas\n`;
  out += `   ai-tool map        Ver estrutura do projeto\n`;

  return out;
}

// ============================================================================
// MISSING TARGET
// ============================================================================

/**
 * Formata mensagem de target obrigatório faltando
 */
export function formatMissingTarget(command: string): string {
  let out = `\n❌ Erro: parâmetro "target" é OBRIGATÓRIO para o comando "${command}".\n\n`;

  out += `📝 Exemplos:\n`;

  if (command === "area") {
    out += `   ai-tool area auth\n`;
    out += `   ai-tool area dashboard\n`;
    out += `   ai-tool area billing --type=hook\n\n`;
    out += `💡 Use 'ai-tool areas' para listar todas as áreas disponíveis.\n`;
  } else {
    out += `   ai-tool ${command} useAuth\n`;
    out += `   ai-tool ${command} Button.tsx\n`;
    out += `   ai-tool ${command} src/hooks/useAuth.ts\n`;
  }

  out += getCommandReferenceSection(command);

  return out;
}

// ============================================================================
// INVALID COMMAND
// ============================================================================

/**
 * Formata mensagem de comando inválido
 */
export function formatInvalidCommand(command: string): string {
  const validCommands = Object.keys(COMMAND_REFERENCE);
  const bestMatch = findBestMatch(command, validCommands);

  let out = `\n❌ Comando inválido: "${command}"\n\n`;

  if (bestMatch) {
    out += `💡 Você quis dizer?\n`;
    out += `   → ai-tool ${bestMatch}\n\n`;
  }

  out += `📌 Comandos disponíveis:\n`;
  for (const [cmd, desc] of Object.entries(COMMAND_REFERENCE)) {
    out += `   ai-tool ${cmd.padEnd(10)} ${desc}\n`;
  }

  return out;
}
