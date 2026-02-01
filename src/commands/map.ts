/**
 * Comando MAP - Mapa do projeto usando Skott
 */

import skott from "skott";
import type {
  MapOptions,
  MapResult,
  MapAreasInfo,
  FileCategory,
  FolderStats,
} from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatMapText, formatMapSummary } from "../formatters/text.js";
import {
  isCacheValid,
  getCachedMapResult,
  cacheMapResult,
  cacheGraph,
  updateCacheMeta,
} from "../cache/index.js";
import { readConfig } from "../areas/config.js";
import { detectFileAreas, getAreaName, isFileIgnored } from "../areas/detector.js";

/**
 * Executa o comando MAP
 */
export async function map(options: MapOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false; // default: true
  const full = options.full ?? false; // default: resumo compacto

  // Tentar usar cache
  if (useCache && isCacheValid(cwd)) {
    const cached = getCachedMapResult<MapResult>(cwd);
    if (cached) {
      // Atualizar timestamp para indicar uso do cache
      const result = { ...cached, timestamp: new Date().toISOString(), fromCache: true };

      if (format === "json") {
        return JSON.stringify(result, null, 2);
      }

      // Se full, mostra lista completa; senão, resumo
      if (full) {
        return formatMapText(result) + "\n\n📦 (resultado do cache)";
      }
      const areasInfo = detectAreasInfo(cwd, result.files.map((f) => f.path));
      return formatMapSummary(result, areasInfo) + "\n📦 (cache)";
    }
  }

  try {
    // Executar Skott
    const { getStructure, useGraph } = await skott({
      cwd,
      includeBaseDir: false,
      dependencyTracking: {
        thirdParty: options.trackDependencies ?? false,
        builtin: false,
        typeOnly: false,
      },
      fileExtensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
      tsConfigPath: "tsconfig.json",
    });

    const structure = getStructure();
    const graphApi = useGraph();
    const { findCircularDependencies } = graphApi;

    // Salvar grafo no cache para uso no impact
    if (useCache) {
      const graphData = {
        graph: structure.graph,
        files: Object.keys(structure.graph),
        timestamp: new Date().toISOString(),
      };
      cacheGraph(cwd, graphData);
    }

    // Processar arquivos
    const files = Object.entries(structure.graph).map(([path]) => ({
      path,
      category: detectCategory(path),
      size: 0, // Skott não fornece tamanho
    }));

    // Agrupar por pasta
    const folderMap = new Map<string, FolderStats>();
    for (const file of files) {
      const parts = file.path.split("/");
      if (parts.length > 1) {
        const folder = parts.slice(0, -1).join("/");

        if (!folderMap.has(folder)) {
          folderMap.set(folder, {
            path: folder,
            fileCount: 0,
            categories: {},
          });
        }

        const stats = folderMap.get(folder)!;
        stats.fileCount++;
        stats.categories[file.category] = (stats.categories[file.category] || 0) + 1;
      }
    }

    // Contar categorias
    const categories: Partial<Record<FileCategory, number>> = {};
    for (const file of files) {
      categories[file.category] = (categories[file.category] || 0) + 1;
    }

    // Detectar dependências circulares
    const circular = findCircularDependencies();

    // Montar resultado
    const result: MapResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      cwd,
      summary: {
        totalFiles: files.length,
        totalFolders: folderMap.size,
        categories,
      },
      folders: Array.from(folderMap.values()),
      files,
      circularDependencies: circular,
    };

    // Salvar no cache
    if (useCache) {
      cacheMapResult(cwd, result);
      updateCacheMeta(cwd);
    }

    // Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    // Se full, mostra lista completa; senão, resumo
    if (full) {
      return formatMapText(result);
    }

    const areasInfo = detectAreasInfo(cwd, files.map((f) => f.path));
    return formatMapSummary(result, areasInfo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar map: ${message}`);
  }
}

/**
 * Detecta informações de áreas de forma leve (apenas nomes e contagens)
 * Filtra arquivos ignorados pela configuração
 */
function detectAreasInfo(cwd: string, filePaths: string[]): MapAreasInfo {
  try {
    const config = readConfig(cwd);
    const areaSet = new Set<string>();
    let unmappedCount = 0;

    for (const filePath of filePaths) {
      // Ignorar arquivos configurados no ignore
      if (isFileIgnored(filePath, config)) {
        continue;
      }

      const areas = detectFileAreas(filePath, config);
      if (areas.length === 0) {
        unmappedCount++;
      } else {
        for (const areaId of areas) {
          areaSet.add(areaId);
        }
      }
    }

    // Ordenar áreas alfabeticamente e pegar nomes amigáveis
    const areaIds = Array.from(areaSet).sort();
    const names = areaIds.map((id) => getAreaName(id, config));

    return {
      names,
      total: areaIds.length,
      unmappedCount,
    };
  } catch {
    // Se falhar a detecção de áreas, retorna vazio
    return { names: [], total: 0, unmappedCount: 0 };
  }
}
