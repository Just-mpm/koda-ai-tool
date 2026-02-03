/**
 * Comando IMPACT - Análise de impacto usando Skott API
 */

import skott from "skott";
import type {
  ImpactOptions,
  ImpactResult,
  ImpactFile,
  RiskInfo,
} from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatImpactText } from "../formatters/text.js";
import {
  isCacheValid,
  getCachedGraph,
  cacheGraph,
  updateCacheMeta,
  type CachedGraph,
} from "../cache/index.js";
import { formatFileNotFound } from "../utils/errors.js";

/**
 * Executa o comando IMPACT
 */
export async function impact(target: string, options: ImpactOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false; // default: true

  if (!target) {
    throw new Error("Target é obrigatório. Exemplo: ai-tool impact src/components/Button.tsx");
  }

  try {
    let graph: CachedGraph["graph"] | undefined;
    let allFiles: string[] = [];
    let findCircular: () => string[][] = () => [];
    let fromCache = false;

    // Tentar usar cache do grafo
    if (useCache && isCacheValid(cwd)) {
      const cached = getCachedGraph(cwd);
      if (cached) {
        graph = cached.graph;
        allFiles = cached.files;
        findCircular = () => findCircularFromGraph(graph!);
        fromCache = true;
      }
    }

    // Se não tem cache, executar Skott
    if (!graph) {
      const { getStructure, useGraph } = await skott({
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
      const graphApi = useGraph();

      graph = structure.graph;
      allFiles = Object.keys(graph);
      findCircular = () => graphApi.findCircularDependencies();

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

    // Calcular dependências a partir do grafo
    const { directUpstream, indirectUpstream, directDownstream, indirectDownstream } =
      calculateDependencies(targetPath, graph);

    const dependingOn = [...directUpstream, ...indirectUpstream];
    const dependencies = [...directDownstream, ...indirectDownstream];

    // Detectar riscos
    const risks = detectRisks(targetPath, dependingOn, dependencies, findCircular);

    // Gerar sugestões
    const suggestions = generateSuggestions(dependingOn, dependencies, risks);

    // Montar resultado
    const result: ImpactResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      target: targetPath,
      category: detectCategory(targetPath),
      upstream: {
        direct: directUpstream.map(toImpactFile(true)),
        indirect: indirectUpstream.map(toImpactFile(false)),
        total: dependingOn.length,
      },
      downstream: {
        direct: directDownstream.map(toImpactFile(true)),
        indirect: indirectDownstream.map(toImpactFile(false)),
        total: dependencies.length,
      },
      risks,
      suggestions,
    };

    // Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    const output = formatImpactText(result);
    return fromCache ? output + "\n\n📦 (grafo do cache)" : output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar impact: ${message}`);
  }
}

/**
 * Calcula dependências a partir do grafo cacheado
 */
function calculateDependencies(
  targetPath: string,
  graph: CachedGraph["graph"]
): {
  directUpstream: string[];
  indirectUpstream: string[];
  directDownstream: string[];
  indirectDownstream: string[];
} {
  // Downstream direto: o que este arquivo importa diretamente
  const targetNode = graph[targetPath];
  const directDownstream = targetNode ? targetNode.adjacentTo : [];

  // Downstream indireto: dependências das dependências (recursivo)
  const allDownstream = new Set<string>();
  const visited = new Set<string>();

  function collectDownstream(file: string) {
    if (visited.has(file)) return;
    visited.add(file);

    const node = graph[file];
    if (node) {
      for (const dep of node.adjacentTo) {
        allDownstream.add(dep);
        collectDownstream(dep);
      }
    }
  }

  collectDownstream(targetPath);
  const indirectDownstream = Array.from(allDownstream).filter(
    (f) => !directDownstream.includes(f)
  );

  // Upstream: quem importa este arquivo
  const directUpstream: string[] = [];
  const allUpstream = new Set<string>();

  // Primeiro passo: encontrar quem importa diretamente
  for (const [file, node] of Object.entries(graph)) {
    if (node.adjacentTo.includes(targetPath)) {
      directUpstream.push(file);
    }
  }

  // Segundo passo: encontrar quem importa indiretamente (recursivo)
  visited.clear();

  function collectUpstream(file: string) {
    if (visited.has(file)) return;
    visited.add(file);

    for (const [f, node] of Object.entries(graph)) {
      if (node.adjacentTo.includes(file) && !visited.has(f)) {
        allUpstream.add(f);
        collectUpstream(f);
      }
    }
  }

  for (const file of directUpstream) {
    collectUpstream(file);
  }

  const indirectUpstream = Array.from(allUpstream).filter(
    (f) => !directUpstream.includes(f)
  );

  return {
    directUpstream,
    indirectUpstream,
    directDownstream,
    indirectDownstream,
  };
}

/**
 * Encontra dependências circulares a partir do grafo
 */
function findCircularFromGraph(graph: CachedGraph["graph"]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (stack.has(node)) {
      // Encontrou ciclo
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    const nodeData = graph[node];
    if (nodeData) {
      for (const dep of nodeData.adjacentTo) {
        dfs(dep);
      }
    }

    path.pop();
    stack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    dfs(node);
  }

  return cycles;
}

/**
 * Encontra o arquivo target no grafo
 */
function findTargetFile(target: string, allFiles: string[]): string | null {
  const normalizedTarget = target.replace(/\\/g, "/").toLowerCase();

  // Match exato
  if (allFiles.includes(normalizedTarget)) {
    return normalizedTarget;
  }

  // Match exato (case-insensitive)
  const exactMatch = allFiles.find(f => f.toLowerCase() === normalizedTarget);
  if (exactMatch) {
    return exactMatch;
  }

  // Separar path e nome do arquivo do target
  const targetParts = normalizedTarget.split("/");
  const targetName = targetParts.pop() || "";
  const targetNameNoExt = targetName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  const targetDir = targetParts.join("/"); // Path sem o nome do arquivo

  const matches: Array<{ file: string; priority: number }> = [];

  for (const file of allFiles) {
    const fileLower = file.toLowerCase();
    const fileParts = fileLower.split("/");
    const fileName = fileParts.pop() || "";
    const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
    const fileDir = fileParts.join("/");

    // Prioridade 1: Match exato de path completo (incluindo diretórios)
    if (fileLower === normalizedTarget) {
      matches.push({ file, priority: 1 });
    }
    // Prioridade 2: Match por nome + diretório contém o path do target
    // Ex: target=src/services/quota/index.ts, file=src/pages/LandingPages/index.ts
    // O diretório do target (src/services/quota) deve estar contido no path do arquivo
    else if (fileNameNoExt === targetNameNoExt) {
      if (targetDir && fileDir.includes(targetDir)) {
        matches.push({ file, priority: 2 });
      } else if (targetDir && normalizedTarget.includes(fileDir)) {
        // Path do target contém diretório do arquivo
        matches.push({ file, priority: 3 });
      } else {
        // Mesmo nome mas diretório diferente - menor prioridade
        matches.push({ file, priority: 4 });
      }
    }
    // Prioridade 5: Match parcial no path completo
    else if (fileLower.includes(normalizedTarget)) {
      matches.push({ file, priority: 5 });
    }
  }

  // Se não encontrou nada, tentar match parcial mais flexível
  if (matches.length === 0) {
    for (const file of allFiles) {
      if (file.toLowerCase().includes(targetNameNoExt)) {
        matches.push({ file, priority: 6 });
      }
    }
  }

  // Ordenar por prioridade e retornar o melhor match
  if (matches.length > 0) {
    matches.sort((a, b) => a.priority - b.priority);
    return matches[0].file;
  }

  return null;
}

/**
 * Formata mensagem de "não encontrado"
 * Usa módulo compartilhado com sugestões "você quis dizer?"
 */
function formatNotFound(target: string, allFiles: string[]): string {
  return formatFileNotFound({ target, allFiles, command: "impact" });
}

/**
 * Converte path para ImpactFile
 */
function toImpactFile(isDirect: boolean): (path: string) => ImpactFile {
  return (path) => ({
    path,
    category: detectCategory(path),
    isDirect,
  });
}

/**
 * Detecta riscos baseado na análise
 */
function detectRisks(
  targetPath: string,
  upstream: string[],
  downstream: string[],
  findCircular: () => string[][]
): RiskInfo[] {
  const risks: RiskInfo[] = [];

  // Arquivo muito usado
  if (upstream.length >= 15) {
    risks.push({
      type: "widely-used",
      severity: "high",
      message: `Arquivo CRÍTICO: usado por ${upstream.length} arquivos únicos`,
    });
  } else if (upstream.length >= 5) {
    risks.push({
      type: "widely-used",
      severity: "medium",
      message: `Arquivo compartilhado: usado por ${upstream.length} arquivos únicos`,
    });
  }

  // Muitas dependências
  if (downstream.length >= 20) {
    risks.push({
      type: "deep-chain",
      severity: "medium",
      message: `Arquivo importa ${downstream.length} dependências (considere dividir)`,
    });
  } else if (downstream.length >= 10) {
    risks.push({
      type: "deep-chain",
      severity: "low",
      message: `Arquivo importa ${downstream.length} dependências`,
    });
  }

  // Dependências circulares
  const circular = findCircular();
  const targetCircular = circular.filter((cycle) => cycle.includes(targetPath));

  if (targetCircular.length > 0) {
    risks.push({
      type: "circular",
      severity: "medium",
      message: `Envolvido em ${targetCircular.length} dependência${targetCircular.length > 1 ? "s" : ""} circular${targetCircular.length > 1 ? "es" : ""}`,
    });
  }

  return risks;
}

/**
 * Gera sugestões baseadas na análise
 */
function generateSuggestions(
  upstream: string[],
  downstream: string[],
  risks: RiskInfo[]
): string[] {
  const suggestions: string[] = [];

  if (upstream.length > 0) {
    suggestions.push(
      `Verifique os ${upstream.length} arquivo(s) que importam este antes de modificar`
    );
  }

  if (upstream.length >= 10) {
    suggestions.push(`Considere criar testes para garantir que mudanças não quebrem dependentes`);
  }

  if (downstream.length > 0) {
    suggestions.push(`Teste as ${downstream.length} dependência(s) após mudanças`);
  }

  if (risks.some((r) => r.type === "circular")) {
    suggestions.push(`Considere resolver as dependências circulares antes de refatorar`);
  }

  if (risks.some((r) => r.type === "widely-used" && r.severity === "high")) {
    suggestions.push(`Este arquivo é crítico - planeje mudanças com cuidado`);
  }

  return suggestions;
}

