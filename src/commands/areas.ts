/**
 * Comando AREAS - Lista todas as áreas do projeto
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import type { AreasOptions, AreasResult, DetectedArea, AreaFile, FileCategory } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { readConfig, getFileDescription } from "../areas/config.js";
import {
  detectFileAreas,
  getAreaName,
  getAreaDescription,
  inferFileDescription,
} from "../areas/detector.js";
import { formatAreasText } from "../formatters/text.js";

/**
 * Extensões de código suportadas
 */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * Pastas a ignorar
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".cache",
  "coverage",
  ".turbo",
  ".vercel",
  ".analyze",
]);

/**
 * Executa o comando AREAS
 */
export async function areas(options: AreasOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";

  try {
    // 1. Ler configuração
    const config = readConfig(cwd);

    // 2. Listar todos os arquivos de código
    const allFiles = getAllCodeFiles(cwd);

    // 3. Detectar área de cada arquivo
    const areaMap = new Map<string, AreaFile[]>();
    const unmapped: AreaFile[] = [];

    for (const filePath of allFiles) {
      const category = detectCategory(filePath);
      const areas = detectFileAreas(filePath, config);

      // Obter descrição
      let description = getFileDescription(cwd, filePath);
      if (!description && config.settings?.inferDescriptions !== false) {
        description = inferFileDescription(filePath, category);
      }

      const areaFile: AreaFile = {
        path: filePath,
        category,
        description,
      };

      if (areas.length === 0) {
        unmapped.push(areaFile);
      } else {
        // Arquivo pode pertencer a múltiplas áreas
        for (const areaId of areas) {
          if (!areaMap.has(areaId)) {
            areaMap.set(areaId, []);
          }
          areaMap.get(areaId)!.push(areaFile);
        }
      }
    }

    // 4. Montar resultado
    const detectedAreas: DetectedArea[] = [];

    for (const [areaId, files] of areaMap) {
      // Contar categorias
      const categories: Partial<Record<FileCategory, number>> = {};
      for (const file of files) {
        categories[file.category] = (categories[file.category] || 0) + 1;
      }

      detectedAreas.push({
        id: areaId,
        name: getAreaName(areaId, config),
        description: getAreaDescription(areaId, config),
        files,
        fileCount: files.length,
        categories,
        isAutoDetected: !config.areas[areaId],
      });
    }

    // Ordenar por quantidade de arquivos (maior primeiro)
    detectedAreas.sort((a, b) => b.fileCount - a.fileCount);

    const result: AreasResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      cwd,
      areas: detectedAreas,
      unmapped,
      summary: {
        totalAreas: detectedAreas.length,
        totalFiles: allFiles.length,
        unmappedCount: unmapped.length,
      },
    };

    // 5. Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatAreasText(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar areas: ${message}`);
  }
}

/**
 * Lista todos os arquivos de código do projeto recursivamente
 */
function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Ignorar pastas não relevantes
      if (IGNORED_DIRS.has(entry) || entry.startsWith(".")) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          getAllCodeFiles(fullPath, files, baseDir);
        } else {
          const ext = extname(entry).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            // Caminho relativo ao baseDir
            const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, "/");
            files.push(relativePath);
          }
        }
      } catch {
        // Ignorar arquivos inacessíveis
      }
    }
  } catch {
    // Ignorar diretórios inacessíveis
  }

  return files;
}
