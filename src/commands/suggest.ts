/**
 * Comando SUGGEST - Sugere arquivos para ler antes de modificar um arquivo
 */

import skott from "skott";
import type {
  SuggestOptions,
  SuggestResult,
  Suggestion,
  SuggestionPriority,
} from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatSuggestText } from "../formatters/text.js";
import {
  isCacheValid,
  getCachedGraph,
  cacheGraph,
  updateCacheMeta,
  type CachedGraph,
} from "../cache/index.js";

/**
 * Executa o comando SUGGEST
 */
export async function suggest(target: string, options: SuggestOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false;
  const limit = options.limit || 10;

  if (!target) {
    throw new Error("Target e obrigatorio. Exemplo: ai-tool suggest src/components/Button.tsx");
  }

  try {
    let graph: CachedGraph["graph"] | undefined;
    let allFiles: string[] = [];
    let fromCache = false;

    // Tentar usar cache do grafo
    if (useCache && isCacheValid(cwd)) {
      const cached = getCachedGraph(cwd);
      if (cached) {
        graph = cached.graph;
        allFiles = cached.files;
        fromCache = true;
      }
    }

    // Se nao tem cache, executar Skott
    if (!graph) {
      const { getStructure } = await skott({
        cwd,
        includeBaseDir: false,
        dependencyTracking: {
          thirdParty: false,
          builtin: false,
          typeOnly: false,
        },
        fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
        tsConfigPath: "tsconfig.json",
      });

      const structure = getStructure();
      graph = structure.graph;
      allFiles = Object.keys(graph);

      // Salvar grafo no cache
      if (useCache) {
        cacheGraph(cwd, {
          graph,
          files: allFiles,
          timestamp: new Date().toISOString(),
        });
        updateCacheMeta(cwd);
      }
    }

    // Encontrar o arquivo target
    const targetPath = findTargetFile(target, allFiles);

    if (!targetPath) {
      return formatNotFound(target, allFiles);
    }

    // Coletar sugestoes
    const suggestions = collectSuggestions(targetPath, graph, allFiles, limit);

    // Montar resultado
    const result: SuggestResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      target: targetPath,
      category: detectCategory(targetPath),
      suggestions,
    };

    // Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    const output = formatSuggestText(result);
    return fromCache ? output + "\n\n(grafo do cache)" : output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar suggest: ${message}`);
  }
}

/**
 * Coleta sugestoes de arquivos para ler
 */
function collectSuggestions(
  targetPath: string,
  graph: CachedGraph["graph"],
  allFiles: string[],
  limit: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const addedPaths = new Set<string>();

  const targetNode = graph[targetPath];
  if (!targetNode) {
    return suggestions;
  }

  // 1. Dependencias diretas (o que o arquivo importa)
  for (const dep of targetNode.adjacentTo) {
    if (addedPaths.has(dep)) continue;
    addedPaths.add(dep);

    const category = detectCategory(dep);

    // Types/interfaces sao CRITICAL
    if (category === "type") {
      suggestions.push({
        path: dep,
        category,
        reason: "Define tipos usados",
        priority: "critical",
      });
    } else {
      // Outras dependencias sao HIGH
      suggestions.push({
        path: dep,
        category,
        reason: "Importado diretamente",
        priority: "high",
      });
    }
  }

  // 2. Upstream (quem importa este arquivo) - max 5
  const upstream = findUpstream(targetPath, graph);
  const upstreamLimited = upstream.slice(0, 5);

  for (const file of upstreamLimited) {
    if (addedPaths.has(file)) continue;
    addedPaths.add(file);

    suggestions.push({
      path: file,
      category: detectCategory(file),
      reason: "Usa este arquivo",
      priority: "medium",
    });
  }

  // 3. Testes relacionados
  const relatedTests = findRelatedTests(targetPath, allFiles);

  for (const testFile of relatedTests) {
    if (addedPaths.has(testFile)) continue;
    addedPaths.add(testFile);

    suggestions.push({
      path: testFile,
      category: "test",
      reason: "Testa este arquivo",
      priority: "low",
    });
  }

  // Ordenar por prioridade e aplicar limite
  const priorityOrder: Record<SuggestionPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions.slice(0, limit);
}

/**
 * Encontra arquivos que importam o target (upstream direto)
 */
function findUpstream(targetPath: string, graph: CachedGraph["graph"]): string[] {
  const upstream: string[] = [];

  for (const [file, node] of Object.entries(graph)) {
    if (node.adjacentTo.includes(targetPath)) {
      upstream.push(file);
    }
  }

  return upstream;
}

/**
 * Encontra testes relacionados ao arquivo
 */
function findRelatedTests(targetPath: string, allFiles: string[]): string[] {
  const targetName = targetPath.split("/").pop() || "";
  const targetNameNoExt = targetName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

  const tests: string[] = [];

  for (const file of allFiles) {
    const fileName = file.split("/").pop() || "";

    // Padrao: NomeArquivo.test.ts ou NomeArquivo.spec.ts
    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      file.includes("/__tests__/")
    ) {
      // Verificar se o nome do teste contem o nome do arquivo
      const testNameNoExt = fileName
        .replace(/\.(test|spec)\..*$/, "")
        .replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

      if (testNameNoExt.toLowerCase() === targetNameNoExt.toLowerCase()) {
        tests.push(file);
      }
    }
  }

  return tests;
}

/**
 * Encontra o arquivo target no grafo
 */
function findTargetFile(target: string, allFiles: string[]): string | null {
  const normalizedTarget = target.replace(/\\/g, "/");

  // Match exato
  if (allFiles.includes(normalizedTarget)) {
    return normalizedTarget;
  }

  // Match por nome do arquivo
  const targetName = normalizedTarget.split("/").pop()?.toLowerCase() || "";
  const targetNameNoExt = targetName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

  const matches: string[] = [];

  for (const file of allFiles) {
    const fileName = file.split("/").pop()?.toLowerCase() || "";
    const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

    // Match exato por nome
    if (fileNameNoExt === targetNameNoExt) {
      matches.unshift(file); // Prioridade
    }
    // Match parcial
    else if (file.toLowerCase().includes(normalizedTarget.toLowerCase())) {
      matches.push(file);
    }
  }

  // Se so encontrou um, retorna ele
  if (matches.length === 1) {
    return matches[0];
  }

  // Se encontrou multiplos, retorna o primeiro (mais especifico)
  if (matches.length > 1) {
    return matches[0];
  }

  return null;
}

/**
 * Formata mensagem de "nao encontrado"
 */
function formatNotFound(target: string, allFiles: string[]): string {
  const normalizedTarget = target.toLowerCase();

  // Buscar arquivos similares
  const similar = allFiles
    .filter((f) => {
      const fileName = f.split("/").pop()?.toLowerCase() || "";
      const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
      return (
        fileName.includes(normalizedTarget) ||
        fileNameNoExt.includes(normalizedTarget) ||
        levenshteinDistance(fileNameNoExt, normalizedTarget) <= 3
      );
    })
    .slice(0, 5);

  let out = `Arquivo nao encontrado no indice: "${target}"\n\n`;
  out += `Total de arquivos indexados: ${allFiles.length}\n\n`;

  if (similar.length > 0) {
    out += `Arquivos com nome similar:\n`;
    for (const s of similar) {
      out += `   - ${s}\n`;
    }
    out += `\n`;
  }

  out += `Dicas:\n`;
  out += `   - Use o caminho relativo: src/components/Header.tsx\n`;
  out += `   - Ou apenas o nome do arquivo: Header\n`;
  out += `   - Verifique se o arquivo esta em uma pasta incluida no scan\n`;

  return out;
}

/**
 * Calcula distancia de Levenshtein para sugestoes
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
