/**
 * Comando DESCRIBE - Busca areas por descricao usando keywords + Levenshtein
 *
 * Enriquece a busca com:
 * - Stopwords PT-BR/EN (filtra palavras comuns da query)
 * - Score parcial (percentual de palavras encontradas)
 * - Keywords da config incluidas no searchableText
 * - Nomes de arquivos reais + simbolos exportados no searchableText
 */

import { readConfig } from "../areas/config.js";
import { parseCommandOptions, formatOutput } from "./base.js";
import { findSimilar } from "../utils/similarity.js";
import { detectFileAreas, isFileIgnored } from "../areas/detector.js";
import { getAllCodeFiles } from "../ts/index.js";
import { indexProject, type ProjectIndex } from "../ts/cache.js";
import {
  isCacheValid,
  getCachedSymbolsIndex,
  cacheSymbolsIndex,
  updateCacheMeta,
} from "../cache/index.js";
import type { AreasConfigFile } from "../types.js";

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
 * Opcoes do comando describe
 */
export interface DescribeOptions {
  cwd?: string;
  format?: "text" | "json";
}

/**
 * Palavras comuns que poluem buscas em PT-BR e EN.
 * Filtradas da query antes de calcular o score parcial.
 */
const STOPWORDS = new Set([
  // PT-BR
  "de", "da", "do", "das", "dos", "para", "com", "em", "uma", "um",
  "o", "a", "os", "as", "no", "na", "nos", "nas", "pelo", "pela",
  "que", "e", "ou", "se", "ao", "aos",
  // EN
  "the", "of", "in", "for", "with", "on", "at", "to", "and", "or",
  "is", "are", "was", "by", "an",
]);

/**
 * Remove stopwords de um array de palavras.
 * Se a filtragem remover TODAS as palavras, retorna o array original
 * para evitar uma query vazia.
 *
 * @param words - Array de palavras a filtrar
 * @returns Array filtrado (ou original se tudo foi removido)
 */
export function removeStopwords(words: string[]): string[] {
  const filtered = words.filter((w) => !STOPWORDS.has(w) && w.length > 1);
  return filtered.length > 0 ? filtered : words;
}

/**
 * Calcula score parcial baseado no percentual de palavras da query
 * que NAO foram encontradas no texto.
 *
 * Score 0 = match perfeito (todas as palavras encontradas ou substring completa)
 * Score 1 = nenhuma palavra encontrada
 * Score 0.5 = metade das palavras encontradas
 *
 * @param queryWords - Palavras da query (ja filtradas de stopwords)
 * @param searchableText - Texto enriquecido para busca (ja em lowercase)
 * @returns Score de 0 (melhor) a 1 (pior)
 */
export function calculatePartialScore(queryWords: string[], searchableText: string): number {
  if (queryWords.length === 0) return 1;

  // Substring match completo da query = melhor score possivel
  const fullQuery = queryWords.join(" ");
  if (searchableText.includes(fullQuery)) return 0;

  // Score parcial: quantas palavras foram encontradas
  let found = 0;
  for (const word of queryWords) {
    if (searchableText.includes(word)) {
      found++;
    }
  }

  return 1 - (found / queryWords.length);
}

/**
 * Constroi mapa area->arquivos UMA vez para todos os arquivos do projeto.
 * Evita chamar detectFileAreas N*M vezes (para cada arquivo * cada area).
 *
 * @param allFiles - Lista de todos os arquivos de codigo do projeto
 * @param config - Configuracao de areas
 * @returns Mapa de areaId -> array de caminhos de arquivos
 */
function buildAreaFileMap(
  allFiles: string[],
  config: AreasConfigFile
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const filePath of allFiles) {
    if (isFileIgnored(filePath, config)) continue;
    const fileAreas = detectFileAreas(filePath, config);
    for (const areaId of fileAreas) {
      if (!map.has(areaId)) map.set(areaId, []);
      map.get(areaId)!.push(filePath);
    }
  }

  return map;
}

/**
 * Constroi texto enriquecido para busca combinando:
 * 1. Metadados da area (id, name, description)
 * 2. Keywords do config
 * 3. Nomes de arquivos reais (sem extensao)
 * 4. Nomes de simbolos exportados (funcoes, tipos, componentes, etc)
 *
 * @param candidate - Dados basicos da area candidata
 * @param config - Configuracao de areas (para keywords)
 * @param areaFileMap - Mapa area->arquivos pre-computado
 * @param index - Indice de simbolos do projeto
 * @returns Texto lowercase pronto para busca
 */
function buildSearchableText(
  candidate: { id: string; name: string; description: string },
  config: AreasConfigFile,
  areaFileMap: Map<string, string[]>,
  index: ProjectIndex
): string {
  // 1. Metadados (id, nome, descricao)
  const metadata = `${candidate.id} ${candidate.name} ${candidate.description}`;

  // 2. Keywords do config
  const keywords = config.areas[candidate.id]?.keywords?.join(" ") ?? "";

  // 3. Nomes de arquivos reais (sem extensao)
  const areaFiles = areaFileMap.get(candidate.id) ?? [];
  const fileNames = areaFiles
    .map((f) => {
      const name = f.split("/").pop() ?? "";
      return name.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
    })
    .join(" ");

  // 4. Nomes de simbolos exportados
  const symbolNames: string[] = [];
  for (const filePath of areaFiles) {
    const fileData = index.files[filePath];
    if (fileData?.symbols) {
      for (const symbol of fileData.symbols) {
        if (symbol.isExported) {
          symbolNames.push(symbol.name);
        }
      }
    }
  }

  return `${metadata} ${keywords} ${fileNames} ${symbolNames.join(" ")}`.toLowerCase();
}

/**
 * Busca areas que correspondem a query usando busca enriquecida.
 *
 * Carrega o indice de simbolos (com cache) e constroi texto
 * enriquecido com metadados + keywords + nomes de arquivos + simbolos.
 * Usa score parcial com threshold de 0.6.
 *
 * @param normalizedQuery - Query normalizada (lowercase, trimmed)
 * @param candidates - Lista de areas candidatas
 * @param config - Configuracao de areas
 * @param cwd - Diretorio do projeto
 * @returns Areas que correspondem a query, ordenadas por relevancia
 */
function findAreaMatches(
  normalizedQuery: string,
  candidates: Array<{ id: string; name: string; description: string }>,
  config: AreasConfigFile,
  cwd: string
): AreaMatch[] {
  // 1. Listar todos os arquivos de codigo do projeto
  const allFiles = getAllCodeFiles(cwd);

  // 2. Carregar indice de simbolos (com cache, padrao identico ao areaContext)
  let index: ProjectIndex;
  if (isCacheValid(cwd)) {
    const cached = getCachedSymbolsIndex<ProjectIndex>(cwd);
    if (cached?.files) {
      index = cached;
    } else {
      index = indexProject(cwd);
      cacheSymbolsIndex(cwd, index);
      updateCacheMeta(cwd);
    }
  } else {
    index = indexProject(cwd);
    cacheSymbolsIndex(cwd, index);
    updateCacheMeta(cwd);
  }

  // 3. Construir mapa area->arquivos UMA vez
  const areaFileMap = buildAreaFileMap(allFiles, config);

  // 4. Filtrar stopwords da query
  const queryWords = removeStopwords(normalizedQuery.split(/\s+/));

  // 5. Calcular score parcial para cada candidato
  const matches: AreaMatch[] = [];

  for (const candidate of candidates) {
    const searchableText = buildSearchableText(candidate, config, areaFileMap, index);
    const score = calculatePartialScore(queryWords, searchableText);

    // Threshold: score < 0.6 significa que pelo menos 40% das palavras foram encontradas
    if (score < 0.6) {
      const areaFiles = areaFileMap.get(candidate.id) ?? [];

      matches.push({
        id: candidate.id,
        name: candidate.name,
        description: candidate.description || "Sem descricao",
        files: areaFiles,
        fileCount: areaFiles.length,
        score,
      });
    }
  }

  // 6. Ordenar por score (menor = melhor)
  return matches.sort((a, b) => a.score - b.score);
}

/**
 * Executa o comando DESCRIBE
 *
 * Busca areas por descricao usando match enriquecido com keywords,
 * nomes de arquivos, simbolos exportados e score parcial.
 * Correcoes via Levenshtein para erros de digitacao.
 *
 * @param query - Query de busca em linguagem natural
 * @param options - Opcoes do comando
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

    // 4. Buscar matches (com busca enriquecida)
    const matches = findAreaMatches(normalizedQuery, candidates, config, cwd);

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
      const MAX_FILES = 5;
      const filesToShow = area.files.slice(0, MAX_FILES);
      const remaining = area.files.length - filesToShow.length;

      out += `Arquivos:\n`;
      for (const file of filesToShow) {
        out += `   • ${file}\n`;
      }
      if (remaining > 0) {
        out += `   ... e mais ${remaining} arquivo(s)\n`;
        out += `   → Use 'ai-tool area ${area.id}' para ver todos\n`;
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
