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
import { findTargetFile } from "../utils/file-matcher.js";
import { parseCommandOptions, formatOutput } from "./base.js";
import { hasGitRepo, getCommitsForFile } from "../integrations/git.js";
import type { HintContext } from "../utils/hints.js";

/**
 * Executa o comando IMPACT
 */
export async function impact(target: string, options: ImpactOptions = {}): Promise<string> {
  const { cwd, format } = parseCommandOptions(options);
  const useCache = options.cache !== false; // default: true
  const ctx: HintContext = options.ctx || "cli";

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
      return formatFileNotFound({ target, allFiles, command: "impact", ctx });
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

    // Obter histórico Git se disponível
    const gitHistory = hasGitRepo(cwd)
      ? {
          hasGitRepo: true,
          recentCommits: await getCommitsForFile(targetPath, cwd, 5),
        }
      : {
          hasGitRepo: false,
          recentCommits: [] as Array<{
            hash: string;
            shortHash: string;
            message: string;
            date: string;
            author: string;
          }>,
        };

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
      gitHistory,
    };

    // Formatar output
    return formatOutput(result, format, (r) => formatImpactText(r, ctx), fromCache);
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

