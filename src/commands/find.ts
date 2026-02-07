/**
 * Comando FIND - Busca símbolos no código usando índice cacheado
 *
 * Diferente de grep (texto), busca por símbolos TypeScript:
 * - Funções, tipos, componentes, hooks, constantes
 * - Retorna definição + referências/usos
 * - Suporta filtro por área
 * - Usa cache de símbolos para performance
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { FileCategory } from "../types.js";
import { readConfig } from "../areas/config.js";
import { detectFileAreas, isFileIgnored } from "../areas/detector.js";
import { formatFindText } from "../formatters/text.js";
import { formatAreaNotFound } from "../utils/errors.js";
import {
  isCacheValid,
  getCachedSymbolsIndex,
  cacheSymbolsIndex,
  updateCacheMeta,
} from "../cache/index.js";
import { indexProject, type ProjectIndex, type SymbolInfo } from "../ts/cache.js";
import { parseCommandOptions, formatOutput } from "./base.js";
import type { HintContext } from "../utils/hints.js";

/**
 * Tipos de símbolo que podem ser buscados
 */
export type SymbolType = "function" | "type" | "const" | "component" | "hook" | "trigger" | "all";

/**
 * Opções do comando find
 */
export interface FindOptions {
  cwd?: string;
  format?: "text" | "json";
  type?: SymbolType;
  area?: string;
  def?: boolean;
  refs?: boolean;
  cache?: boolean;
  ctx?: HintContext;
}

/**
 * Representa uma ocorrência encontrada
 */
export interface FindMatch {
  file: string;
  line: number;
  column: number;
  code: string;
  matchType: "definition" | "import" | "usage";
  symbolType: SymbolType;
  category: FileCategory;
}

/**
 * Resultado do comando find
 */
export interface FindResult {
  version: string;
  timestamp: string;
  query: string;
  filters: {
    type?: SymbolType;
    area?: string;
    defOnly: boolean;
    refsOnly: boolean;
  };
  definition: FindMatch | null;
  references: FindMatch[];
  summary: {
    definitions: number;
    references: number;
    files: number;
  };
  fromCache?: boolean;
}

/**
 * Executa o comando FIND
 */
export async function find(query: string, options: FindOptions = {}): Promise<string> {
  const { cwd, format } = parseCommandOptions(options);
  const filterType = options.type || "all";
  const filterArea = options.area;
  const defOnly = options.def ?? false;
  const refsOnly = options.refs ?? false;
  const useCache = options.cache !== false;
  const ctx: HintContext = options.ctx || "cli";

  // Permitir query vazio apenas quando defOnly=true e type !== "all"
  const listAllMode = !query && defOnly && filterType && filterType !== "all";
  
  if (!query && !listAllMode) {
    throw new Error("Query é obrigatória. Exemplo: ai-tool find useAuth\n   Ou use --def para listar todos de um tipo: ai-tool find --type=trigger --def");
  }

  try {
    // 1. Obter índice (do cache ou gerando)
    let index: ProjectIndex;
    let fromCache = false;

    if (useCache && isCacheValid(cwd)) {
      const cached = getCachedSymbolsIndex<ProjectIndex>(cwd);
      if (cached && cached.symbolsByName) {
        index = cached;
        fromCache = true;
      } else {
        index = indexProject(cwd);
        cacheSymbolsIndex(cwd, index);
        updateCacheMeta(cwd);
      }
    } else {
      index = indexProject(cwd);
      if (useCache) {
        cacheSymbolsIndex(cwd, index);
        updateCacheMeta(cwd);
      }
    }

    // 2. Filtrar arquivos por área se especificado
    let allowedFiles: Set<string> | null = null;

    if (filterArea) {
      const config = readConfig(cwd);
      const areaLower = filterArea.toLowerCase();
      allowedFiles = new Set<string>();

      for (const filePath of Object.keys(index.files)) {
        if (isFileIgnored(filePath, config)) continue;

        const fileAreas = detectFileAreas(filePath, config);
        const belongsToArea = fileAreas.some(
          (a) => a.toLowerCase() === areaLower || a.toLowerCase().includes(areaLower)
        );

        if (belongsToArea) {
          allowedFiles.add(filePath);
        }
      }

      if (allowedFiles.size === 0) {
        // Coletar areas disponiveis para sugestoes inteligentes
        const availableAreas = new Map<string, number>();
        for (const filePath of Object.keys(index.files)) {
          if (isFileIgnored(filePath, config)) continue;
          const fileAreas = detectFileAreas(filePath, config);
          for (const areaId of fileAreas) {
            availableAreas.set(areaId, (availableAreas.get(areaId) || 0) + 1);
          }
        }

        const areaList = [...availableAreas.entries()]
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count);

        if (format === "json") {
          return JSON.stringify({ error: `Nenhum arquivo encontrado na area "${filterArea}"`, availableAreas: areaList });
        }
        return formatAreaNotFound({ target: filterArea, availableAreas: areaList, ctx });
      }
    }

    // 3. Buscar símbolos
    const matches = searchInIndex(index, query, filterType, allowedFiles, cwd);

    // 4. Separar definição e referências
    let definition: FindMatch | null = null;
    let references: FindMatch[] = [];

    for (const match of matches) {
      if (match.matchType === "definition") {
        if (!definition) {
          definition = match;
        }
      } else {
        references.push(match);
      }
    }

    // 5. Aplicar filtros def/refs
    if (defOnly) {
      references = [];
    }
    if (refsOnly) {
      definition = null;
    }

    // 6. Contar arquivos únicos
    const uniqueFiles = new Set<string>();
    if (definition) uniqueFiles.add(definition.file);
    for (const ref of references) {
      uniqueFiles.add(ref.file);
    }

    // 7. Montar resultado
    const result: FindResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      query,
      filters: {
        type: filterType !== "all" ? filterType : undefined,
        area: filterArea,
        defOnly,
        refsOnly,
      },
      definition,
      references,
      summary: {
        definitions: definition ? 1 : 0,
        references: references.length,
        files: uniqueFiles.size,
      },
      fromCache,
    };

    // 8. Formatar output
    const allSymbolNames = Object.keys(index.symbolsByName);
    return formatOutput(result, format, (r) => formatFindText(r, ctx, allSymbolNames), fromCache);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar find: ${message}`);
  }
}

/**
 * Busca símbolos no índice
 */
function searchInIndex(
  index: ProjectIndex,
  query: string,
  filterType: SymbolType,
  allowedFiles: Set<string> | null,
  cwd?: string
): FindMatch[] {
  const matches: FindMatch[] = [];
  const queryLower = query?.toLowerCase() || "";
  const processedSymbols = new Set<string>(); // Evitar duplicatas
  const listAllMode = !query && filterType && filterType !== "all";

  // 1. Buscar por nome exato ou parcial no índice de símbolos
  for (const [name, symbols] of Object.entries(index.symbolsByName)) {
    const nameLower = name.toLowerCase();

    // Match exato ou parcial (ou listar todos se em modo listAll)
    const shouldInclude = listAllMode || nameLower === queryLower || nameLower.includes(queryLower);
    
    if (shouldInclude) {
      for (const symbol of symbols) {
        // Filtrar por área
        if (allowedFiles && !allowedFiles.has(symbol.file)) continue;

        // Filtrar por tipo
        if (!matchesType(symbol.kind, filterType)) continue;

        const key = `${symbol.file}:${symbol.line}:${symbol.name}`;
        if (processedSymbols.has(key)) continue;
        processedSymbols.add(key);

        const fileData = index.files[symbol.file];

        matches.push({
          file: symbol.file,
          line: symbol.line,
          column: 0,
          code: symbol.signature,
          matchType: "definition",
          symbolType: mapKindToSymbolType(symbol.kind),
          category: fileData?.category || "other",
        });
      }
    }
  }

  // 2. Buscar imports que contêm o termo (apenas se não estiver em modo listAll)
  if (!listAllMode) {
    for (const [filePath, fileData] of Object.entries(index.files)) {
      // Filtrar por área
      if (allowedFiles && !allowedFiles.has(filePath)) continue;

      for (const imp of fileData.imports) {
        for (const spec of imp.specifiers) {
          const specLower = spec.toLowerCase();
          if (specLower === queryLower || specLower.includes(queryLower)) {
            const key = `import:${filePath}:${spec}:${imp.source}`;
            if (processedSymbols.has(key)) continue;
            processedSymbols.add(key);

            matches.push({
              file: filePath,
              line: 1, // Imports geralmente estão no topo
              column: 0,
              code: `import { ${spec} } from '${imp.source}'`,
              matchType: "import",
              symbolType: inferSymbolTypeFromName(spec),
              category: fileData.category,
            });
          }
        }
      }
    }
  }

  // 3. Buscar usos reais nos arquivos que importam o símbolo
  if (!listAllMode && query) {
    const importFiles = matches
      .filter((m) => m.matchType === "import")
      .map((m) => m.file);

    const baseCwd = cwd || "";
    const MAX_USAGE_FILES = 10;
    const MAX_USAGES_PER_FILE = 3;

    for (const filePath of importFiles.slice(0, MAX_USAGE_FILES)) {
      try {
        const fullPath = baseCwd ? join(baseCwd, filePath) : filePath;
        const content = readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");

        // Regex para encontrar uso real (não import/export/comment)
        const usageRegex = new RegExp(`\\b${escapeRegex(query)}\\b`);
        let usagesFound = 0;

        for (let i = 0; i < lines.length && usagesFound < MAX_USAGES_PER_FILE; i++) {
          const line = lines[i].trim();

          // Pular imports, exports, comentários
          if (line.startsWith("import ") || line.startsWith("export ") || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) {
            continue;
          }

          if (usageRegex.test(line)) {
            const key = `usage:${filePath}:${i + 1}:${query}`;
            if (processedSymbols.has(key)) continue;
            processedSymbols.add(key);

            const fileData = index.files[filePath];
            const codeLine = line.length > 100 ? line.substring(0, 100) + "..." : line;

            matches.push({
              file: filePath,
              line: i + 1,
              column: 0,
              code: codeLine,
              matchType: "usage",
              symbolType: inferSymbolTypeFromName(query),
              category: fileData?.category || "other",
            });

            usagesFound++;
          }
        }
      } catch {
        // Arquivo não legível, ignorar
      }
    }
  }

  // Ordenar: definições primeiro, depois imports, depois usos
  matches.sort((a, b) => {
    const order = { definition: 0, import: 1, usage: 2 };
    const orderDiff = order[a.matchType] - order[b.matchType];
    if (orderDiff !== 0) return orderDiff;
    return a.file.localeCompare(b.file) || a.line - b.line;
  });

  return matches;
}

/**
 * Escapa caracteres especiais de regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Verifica se o tipo do símbolo corresponde ao filtro
 */
function matchesType(kind: SymbolInfo["kind"], filter: SymbolType): boolean {
  if (filter === "all") return true;

  switch (filter) {
    case "function":
      // IMPORTANTE: triggers são funções! Isso corrige o bug onde
      // Cloud Functions não eram encontradas com --type=function
      return kind === "function" || kind === "trigger";
    case "type":
      return kind === "type" || kind === "interface" || kind === "enum";
    case "const":
      return kind === "const";
    case "component":
      return kind === "component";
    case "hook":
      return kind === "hook";
    case "trigger":
      return kind === "trigger";
    default:
      return true;
  }
}

/**
 * Mapeia kind interno para SymbolType
 */
function mapKindToSymbolType(kind: SymbolInfo["kind"]): SymbolType {
  switch (kind) {
    case "function":
      return "function";
    case "hook":
      return "hook";
    case "component":
      return "component";
    case "type":
    case "interface":
    case "enum":
      return "type";
    case "const":
      return "const";
    case "trigger":
      return "trigger";
    default:
      return "function";
  }
}

/**
 * Infere tipo de símbolo pelo nome
 */
function inferSymbolTypeFromName(name: string): SymbolType {
  if (name.startsWith("use") && name.length > 3 && name[3] === name[3].toUpperCase()) {
    return "hook";
  }
  if (name[0] === name[0].toUpperCase()) {
    return "type"; // Pode ser tipo ou componente
  }
  return "function";
}
