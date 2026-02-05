/**
 * Comando DESCRIBE - Busca áreas por descrição usando keywords + Levenshtein
 */

import { readConfig } from "../areas/config.js";
import { parseCommandOptions, formatOutput } from "./base.js";
import { findSimilar } from "../utils/similarity.js";

/**
 * Resultado do comando describe
 */
export interface DescribeResult {
  version: string;
  timestamp: string;
  query: string;
  areas: AreaMatch[];
  suggestions?: string[];
}

export interface AreaMatch {
  id: string;
  name: string;
  description: string;
  files: string[];
  fileCount: number;
  score: number;
}

/**
 * Opções do comando describe
 */
export interface DescribeOptions {
  cwd?: string;
  format?: "text" | "json";
}

/**
 * Executa o comando DESCRIBE
 *
 * Busca áreas por descrição usando match direto de keywords
 * e correções via Levenshtein para erros de digitação.
 *
 * @param query - Query de busca em linguagem natural
 * @param options - Opções do comando
 * @returns Resultado formatado como string
 */
export async function describe(
  query: string,
  options: DescribeOptions = {}
): Promise<string> {
  const { cwd, format } = parseCommandOptions(options);

  if (!query || query.trim().length === 0) {
    throw new Error("Query é obrigatória. Exemplo: ai-tool describe 'autenticação'");
  }

  try {
    // 1. Ler configuração
    const config = readConfig(cwd);

    // 2. Normalizar query
    const normalizedQuery = query.toLowerCase().trim();

    // 3. Criar lista de candidatos (todas as áreas definidas)
    const candidates = Object.entries(config.areas).map(([id, area]) => ({
      id,
      name: area.name,
      description: area.description || "",
    }));

    // 4. Buscar matches
    const matches = findAreaMatches(normalizedQuery, candidates, config);

    // 5. Se não encontrou nada, tentar correções via Levenshtein
    const suggestions: string[] = [];
    if (matches.length === 0) {
      const similarAreaIds = findSimilar(
        normalizedQuery,
        candidates.map((c) => c.id),
        { maxDistance: 2, limit: 3 }
      );

      const similarNames = findSimilar(
        normalizedQuery,
        candidates.map((c) => c.name),
        { maxDistance: 2, limit: 3 }
      );

      suggestions.push(
        ...similarAreaIds.map((id) => `→ ai-tool describe ${id}`),
        ...similarNames.map((name) => `→ ai-tool describe "${name}"`)
      );
    }

    // 6. Montar resultado
    const result: DescribeResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      query,
      areas: matches,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };

    // 7. Formatar output
    return formatOutput(result, format, formatDescribeText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar describe: ${message}`);
  }
}

/**
 * Busca áreas que correspondem à query
 */
function findAreaMatches(
  normalizedQuery: string,
  candidates: Array<{ id: string; name: string; description: string }>,
  config: ReturnType<typeof readConfig>
): AreaMatch[] {
  const matches: AreaMatch[] = [];

  for (const candidate of candidates) {
    const searchableText = `${candidate.id} ${candidate.name} ${candidate.description}`.toLowerCase();

    // 1. Verificar match direto por substring
    const hasDirectMatch = searchableText.includes(normalizedQuery);

    // 2. Verificar match por palavras individuais (para queries multi-palavra)
    const queryWords = normalizedQuery.split(/\s+/);
    const allWordsMatch = queryWords.every((word) => searchableText.includes(word));

    if (hasDirectMatch || allWordsMatch) {
      // 3. Coletar arquivos da área
      const areaFiles = getAreaFiles(candidate.id, config);

      // 4. Calcular score de relevância
      const score = calculateRelevanceScore(normalizedQuery, searchableText);

      matches.push({
        id: candidate.id,
        name: candidate.name,
        description: candidate.description || "Sem descrição",
        files: areaFiles,
        fileCount: areaFiles.length,
        score,
      });
    }
  }

  // Ordenar por relevância (score 0 = melhor, pois é distância de Levenshtein)
  return matches.sort((a, b) => a.score - b.score);
}

/**
 * Coleta arquivos de uma área
 */
function getAreaFiles(areaId: string, config: ReturnType<typeof readConfig>): string[] {
  const files: string[] = [];

  // Para simplificar, vamos retornar files baseados no padrão definido no config
  // Em uma implementação completa, isso usaria o indexador de arquivos
  const areaConfig = config.areas[areaId];
  if (areaConfig?.patterns) {
    // Nota: em produção, isso usaria glob patterns reais
    // Por enquanto, vamos retornar uma mensagem informativa
    files.push(`[Use 'ai-tool area ${areaId}' para ver arquivos completos]`);
  }

  return files;
}

/**
 * Calcula score de relevância baseado na query e texto
 * Score 0 = match perfeito, maior score = menos relevante
 */
function calculateRelevanceScore(query: string, text: string): number {
  // Se query é substring do texto, score 0 (melhor)
  if (text.includes(query)) {
    return 0;
  }

  // Se todas as palavras da query estão no texto, score 1
  const queryWords = query.split(/\s+/).filter(Boolean);
  const allWordsPresent = queryWords.every((word) => text.includes(word));

  if (allWordsPresent) {
    return 1;
  }

  // Caso contrário, usar distância de Levenshtein
  // (Mas esse caso não deveria ocorrer, pois já filtramos antes)
  return 10;
}

/**
 * Formata resultado do DESCRIBE para texto
 */
export function formatDescribeText(result: DescribeResult): string {
  let out = "";

  if (result.areas.length === 0) {
    out += `❌ Nenhuma área encontrada para: "${result.query}"\n\n`;

    if (result.suggestions && result.suggestions.length > 0) {
      out += `💡 Você quis dizer?\n`;
      for (const suggestion of result.suggestions) {
        out += `   ${suggestion}\n`;
      }
      out += `\n`;
    }

    out += `📖 Dica: Use 'ai-tool areas' para listar todas as áreas disponíveis`;
    return out;
  }

  // Header
  out += `🔍 Busca: "${result.query}"\n\n`;

  // Áreas encontradas
  for (const area of result.areas) {
    out += `## ${area.name} (${area.id})\n`;
    out += `${area.description}\n`;
    out += `📁 ${area.fileCount} arquivo(s)\n\n`;

    if (area.files.length > 0) {
      out += `Arquivos:\n`;
      for (const file of area.files) {
        out += `   • ${file}\n`;
      }
      out += "\n";
    }
  }

  // Dicas de navegação
  out += `📖 Próximos passos:\n`;
  out += `   → ai-tool area <id> - ver detalhes de uma área\n`;
  out += `   → ai-tool context --area=<id> - contexto completo de uma área\n`;

  return out;
}
