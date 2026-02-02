/**
 * Comando AREA - Mostra detalhes de uma área específica
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import type { AreaOptions, AreaDetailResult, AreaFile, FileCategory, DetectedArea } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { readConfig, getFileDescription } from "../areas/config.js";
import {
  detectFileAreas,
  getAreaName,
  getAreaDescription,
  inferFileDescription,
  isFileIgnored,
} from "../areas/detector.js";
import { AREA_NAMES } from "../areas/patterns.js";
import { formatAreaDetailText } from "../formatters/text.js";
import { formatAreaNotFound as formatAreaNotFoundError } from "../utils/errors.js";

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
 * Resolve um nome de área (ID ou nome amigável) para o ID real
 * Suporta: "auth" → "auth", "Autenticação" → "auth"
 */
function resolveAreaId(
  target: string,
  config: ReturnType<typeof readConfig>,
  allFiles: string[]
): string {
  const targetLower = target.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Verificar se já é um ID válido
  if (config.areas[target]) {
    return target;
  }

  // 2. Verificar configuração manual (nome amigável)
  for (const [id, areaConfig] of Object.entries(config.areas)) {
    const name = areaConfig.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (name === targetLower) {
      return id;
    }
  }

  // 3. Verificar padrões predefinidos (AREA_NAMES)
  for (const [id, name] of Object.entries(AREA_NAMES)) {
    const nameNormalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (nameNormalized === targetLower) {
      return id;
    }
  }

  // 4. Match parcial no ID
  for (const id of Object.keys(config.areas)) {
    if (id.toLowerCase().includes(targetLower)) {
      return id;
    }
  }

  // 5. Match parcial em áreas detectadas automaticamente
  const detectedAreas = new Set<string>();
  for (const filePath of allFiles) {
    const areas = detectFileAreas(filePath, config);
    for (const areaId of areas) {
      if (areaId.toLowerCase().includes(targetLower)) {
        detectedAreas.add(areaId);
      }
    }
  }

  if (detectedAreas.size > 0) {
    return [...detectedAreas][0];
  }

  // Retornar o target original (não encontrado)
  return target;
}

/**
 * Executa o comando AREA
 */
export async function area(target: string, options: AreaOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const filterType = options.type;
  const full = options.full ?? false;

  if (!target) {
    throw new Error("Nome da área é obrigatório. Exemplo: ai-tool area auth");
  }

  try {
    // 1. Ler configuração
    const config = readConfig(cwd);

    // 2. Listar todos os arquivos de código
    const allFiles = getAllCodeFiles(cwd);
    
    // 3. Resolver nome amigável para ID
    const resolvedTarget = resolveAreaId(target, config, allFiles);

    // 4. Filtrar arquivos ignorados
    const filteredFiles = allFiles.filter((filePath) => !isFileIgnored(filePath, config));

    // 5. Filtrar arquivos da área específica
    const areaFiles: AreaFile[] = [];
    const targetLower = resolvedTarget.toLowerCase();

    for (const filePath of filteredFiles) {
      const fileAreas = detectFileAreas(filePath, config);

      // Verificar se arquivo pertence à área (match parcial ou exato)
      const belongsToArea = fileAreas.some(
        (a) => a.toLowerCase() === targetLower || a.toLowerCase().includes(targetLower)
      );

      if (belongsToArea) {
        const category = detectCategory(filePath);

        // Filtrar por tipo se especificado
        if (filterType && category !== filterType) {
          continue;
        }

        // Obter descrição
        let description = getFileDescription(cwd, filePath);
        if (!description && config.settings?.inferDescriptions !== false) {
          description = inferFileDescription(filePath, category);
        }

        areaFiles.push({
          path: filePath,
          category,
          description,
        });
      }
    }

    // 5. Verificar se área foi encontrada
    if (areaFiles.length === 0) {
      // Listar áreas disponíveis
      const availableAreas = getAvailableAreas(filteredFiles, config);
      return formatAreaNotFound(target, availableAreas);
    }

    // 6. Agrupar por categoria
    const byCategory: Partial<Record<FileCategory, AreaFile[]>> = {};
    const categories: Partial<Record<FileCategory, number>> = {};

    for (const file of areaFiles) {
      if (!byCategory[file.category]) {
        byCategory[file.category] = [];
      }
      byCategory[file.category]!.push(file);
      categories[file.category] = (categories[file.category] || 0) + 1;
    }

    // Ordenar arquivos dentro de cada categoria por path
    for (const cat of Object.keys(byCategory) as FileCategory[]) {
      byCategory[cat]!.sort((a, b) => a.path.localeCompare(b.path));
    }

    // 7. Usar ID resolvido (ou o target original se não encontrou)
    const realAreaId = resolvedTarget !== target ? resolvedTarget : findRealAreaId(target, filteredFiles, config);
    const finalAreaId = realAreaId || resolvedTarget;
    
    // Mostrar mensagem informativa se houve conversão de nome
    const nameConversionMsg = resolvedTarget !== target 
      ? `\n💡 Buscando área "${getAreaName(finalAreaId, config)}" (ID: ${finalAreaId})\n`
      : "";

    // 8. Montar resultado
    const detectedArea: DetectedArea = {
      id: finalAreaId,
      name: getAreaName(finalAreaId, config),
      description: getAreaDescription(finalAreaId, config),
      files: areaFiles,
      fileCount: areaFiles.length,
      categories,
      isAutoDetected: !config.areas[finalAreaId],
    };

    const result: AreaDetailResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      area: detectedArea,
      byCategory,
    };

    // 9. Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    const output = formatAreaDetailText(result, { full, filterType });
    return nameConversionMsg + output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar area: ${message}`);
  }
}

/**
 * Encontra o ID real da área (pode ser diferente do input do usuário)
 */
function findRealAreaId(
  target: string,
  allFiles: string[],
  config: ReturnType<typeof readConfig>
): string | null {
  const targetLower = target.toLowerCase();

  // Verificar config primeiro
  for (const areaId of Object.keys(config.areas)) {
    if (areaId.toLowerCase() === targetLower || areaId.toLowerCase().includes(targetLower)) {
      return areaId;
    }
  }

  // Verificar áreas detectadas
  const detectedAreas = new Set<string>();
  for (const filePath of allFiles) {
    const areas = detectFileAreas(filePath, config);
    for (const areaId of areas) {
      if (areaId.toLowerCase() === targetLower || areaId.toLowerCase().includes(targetLower)) {
        detectedAreas.add(areaId);
      }
    }
  }

  // Retornar a primeira encontrada
  return detectedAreas.size > 0 ? [...detectedAreas][0] : null;
}

/**
 * Obtém lista de áreas disponíveis
 */
function getAvailableAreas(
  allFiles: string[],
  config: ReturnType<typeof readConfig>
): Array<{ id: string; count: number }> {
  const areaCounts = new Map<string, number>();

  for (const filePath of allFiles) {
    const areas = detectFileAreas(filePath, config);
    for (const areaId of areas) {
      areaCounts.set(areaId, (areaCounts.get(areaId) || 0) + 1);
    }
  }

  return [...areaCounts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Formata mensagem de área não encontrada
 * Usa módulo compartilhado com sugestões "você quis dizer?"
 */
function formatAreaNotFound(target: string, availableAreas: Array<{ id: string; count: number }>): string {
  return formatAreaNotFoundError({ target, availableAreas });
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
