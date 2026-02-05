/**
 * Comando CONTEXT - Extrai assinaturas de funcoes e tipos de um arquivo
 * Também suporta --area para contexto consolidado de toda uma área
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve, basename, extname } from "path";
import type {
  ContextOptions,
  ContextResult,
  AreaContextResult,
  AreaContextTypeInfo,
  AreaContextFunctionInfo,
  AreaContextComponentInfo,
  AreaContextStoreInfo,
  AreaContextTriggerInfo,
} from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatContextText, formatAreaContextText } from "../formatters/text.js";
import {
  createProject,
  addSourceFile,
  extractImports,
  extractFunctions,
  extractTypes,
  extractExports,
} from "../ts/extractor.js";
import { formatFileNotFound } from "../utils/errors.js";
import { readConfig } from "../areas/config.js";
import {
  detectFileAreas,
  getAreaName,
  getAreaDescription,
  isFileIgnored,
} from "../areas/detector.js";
import {
  isCacheValid,
  getCachedSymbolsIndex,
  cacheSymbolsIndex,
  updateCacheMeta,
} from "../cache/index.js";
import { indexProject, type ProjectIndex } from "../ts/cache.js";
import { parseCommandOptions, formatOutput } from "./base.js";

/**
 * Executa o comando CONTEXT
 */
export async function context(target: string, options: ContextOptions = {}): Promise<string> {
  const { cwd, format } = parseCommandOptions(options);

  if (!target) {
    throw new Error("Target e obrigatorio. Exemplo: ai-tool context src/components/Button.tsx");
  }

  try {
    // 1. Encontrar arquivo target
    const targetPath = findTargetFile(target, cwd);

    if (!targetPath) {
      const allFiles = getAllCodeFiles(cwd);
      return formatFileNotFound({ target, allFiles, command: "context" });
    }

    // 2. Criar projeto ts-morph
    const project = createProject(cwd);

    // 3. Adicionar arquivo ao projeto
    const absolutePath = resolve(cwd, targetPath);
    const sourceFile = addSourceFile(project, absolutePath);

    // 4. Extrair informacoes usando extractor.ts
    const imports = extractImports(sourceFile);
    const functions = extractFunctions(sourceFile);
    const types = extractTypes(sourceFile);
    const exports = extractExports(sourceFile);

    // 5. Montar resultado
    const result: ContextResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      file: targetPath,
      category: detectCategory(targetPath),
      imports,
      exports,
      functions,
      types,
    };

    // 6. Formatar output
    return formatOutput(result, format, formatContextText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar context: ${message}`);
  }
}

/**
 * Extensoes de codigo suportadas
 */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * Encontra o arquivo target no diretorio
 */
function findTargetFile(target: string, cwd: string): string | null {
  const normalizedTarget = target.replace(/\\/g, "/");

  // 1. Tentar caminho absoluto ou relativo exato
  const directPath = resolve(cwd, normalizedTarget);
  if (existsSync(directPath) && isCodeFile(directPath)) {
    // Retornar caminho relativo ao cwd
    return normalizedTarget;
  }

  // 2. Tentar adicionar extensoes comuns
  for (const ext of CODE_EXTENSIONS) {
    const withExt = directPath + ext;
    if (existsSync(withExt)) {
      return normalizedTarget + ext;
    }
  }

  // 3. Buscar por nome do arquivo em todo o projeto
  const targetName = basename(normalizedTarget).toLowerCase();
  const targetNameNoExt = targetName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  const allFiles = getAllCodeFiles(cwd);

  const matches: string[] = [];

  for (const file of allFiles) {
    const fileName = basename(file).toLowerCase();
    const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

    // Match exato por nome
    if (fileNameNoExt === targetNameNoExt) {
      matches.unshift(file); // Prioridade
    }
    // Match parcial (nome contem o target)
    else if (file.toLowerCase().includes(normalizedTarget.toLowerCase())) {
      matches.push(file);
    }
  }

  // Se encontrou matches, retornar o primeiro (mais especifico)
  if (matches.length > 0) {
    return matches[0];
  }

  return null;
}

/**
 * Verifica se um caminho e um arquivo de codigo
 */
function isCodeFile(filePath: string): boolean {
  const ext = extname(filePath);
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Lista todos os arquivos de codigo do projeto recursivamente
 */
function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Ignorar node_modules, dist, .git, etc
      if (shouldIgnore(entry)) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          getAllCodeFiles(fullPath, files, baseDir);
        } else if (isCodeFile(entry)) {
          // Caminho relativo ao baseDir
          const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, "/");
          files.push(relativePath);
        }
      } catch {
        // Ignorar arquivos que nao conseguimos ler
      }
    }
  } catch {
    // Ignorar diretorios que nao conseguimos ler
  }

  return files;
}

/**
 * Pastas a ignorar na busca
 */
function shouldIgnore(name: string): boolean {
  const ignoredDirs = [
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    ".cache",
    "coverage",
    ".turbo",
    ".vercel",
  ];
  return ignoredDirs.includes(name) || name.startsWith(".");
}

// ============================================================================
// AREA CONTEXT - Contexto consolidado de toda uma área
// ============================================================================

export interface AreaContextOptions {
  cwd?: string;
  format?: "text" | "json";
  cache?: boolean;
}

/**
 * Executa o comando CONTEXT --area
 * Retorna contexto consolidado de todos os arquivos de uma área
 * Usa cache de símbolos para performance
 */
export async function areaContext(areaName: string, options: AreaContextOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false;

  if (!areaName) {
    throw new Error("Nome da área é obrigatório. Exemplo: ai-tool context --area=auth");
  }

  try {
    // 1. Ler configuração
    const config = readConfig(cwd);

    // 2. Obter índice (do cache ou gerando)
    let index: ProjectIndex;

    if (useCache && isCacheValid(cwd)) {
      const cached = getCachedSymbolsIndex<ProjectIndex>(cwd);
      if (cached && cached.files) {
        index = cached;
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

    // 3. Filtrar arquivos da área específica
    const areaLower = areaName.toLowerCase();
    const areaFiles: string[] = [];

    for (const filePath of Object.keys(index.files)) {
      if (isFileIgnored(filePath, config)) continue;

      const fileAreas = detectFileAreas(filePath, config);
      const belongsToArea = fileAreas.some(
        (a) => a.toLowerCase() === areaLower || a.toLowerCase().includes(areaLower)
      );

      if (belongsToArea) {
        areaFiles.push(filePath);
      }
    }

    if (areaFiles.length === 0) {
      return format === "json"
        ? JSON.stringify({ error: `Área não encontrada: "${areaName}"` })
        : `❌ Área não encontrada: "${areaName}"\n\n💡 Use 'ai-tool areas' para listar áreas disponíveis`;
    }

    // 4. Coletar contexto de cada arquivo usando o índice
    const types: AreaContextTypeInfo[] = [];
    const hooks: AreaContextFunctionInfo[] = [];
    const functions: AreaContextFunctionInfo[] = [];
    const components: AreaContextComponentInfo[] = [];
    const services: AreaContextFunctionInfo[] = [];
    const stores: AreaContextStoreInfo[] = [];
    const triggers: AreaContextTriggerInfo[] = [];

    for (const filePath of areaFiles) {
      const fileData = index.files[filePath];
      if (!fileData) continue;

      const category = fileData.category;

      for (const symbol of fileData.symbols) {
        if (!symbol.isExported) continue;

        switch (symbol.kind) {
          case "type":
          case "interface":
          case "enum":
            types.push({
              name: symbol.name,
              file: filePath,
              line: symbol.line,
              definition: symbol.definition || symbol.signature,
            });
            break;

          case "hook":
            hooks.push({
              name: symbol.name,
              file: filePath,
              line: symbol.line,
              params: symbol.params || [],
              returns: symbol.returnType || "unknown",
            });
            break;

          case "component":
            components.push({
              name: symbol.name,
              file: filePath,
              line: symbol.line,
              props: symbol.params?.join(", "),
            });
            break;

          case "function":
            if (category === "service" || filePath.includes("service")) {
              services.push({
                name: symbol.name,
                file: filePath,
                line: symbol.line,
                params: symbol.params || [],
                returns: symbol.returnType || "unknown",
              });
            } else {
              functions.push({
                name: symbol.name,
                file: filePath,
                line: symbol.line,
                params: symbol.params || [],
                returns: symbol.returnType || "unknown",
              });
            }
            break;

          case "const":
            // Verificar se é um store (zustand)
            if (
              (category === "store" || filePath.includes("store")) &&
              symbol.name.startsWith("use")
            ) {
              stores.push({
                name: symbol.name,
                file: filePath,
                line: symbol.line,
                state: symbol.definition || "unknown",
              });
            }
            break;

          case "trigger":
            // Cloud Functions Firebase
            triggers.push({
              name: symbol.name,
              file: filePath,
              line: symbol.line,
              triggerType: symbol.triggerInfo?.triggerType || "unknown",
              triggerPath: symbol.triggerInfo?.triggerPath,
              triggerSchedule: symbol.triggerInfo?.triggerSchedule,
            });
            break;
        }
      }
    }

    // 5. Encontrar ID real da área (para nome e descrição)
    const realAreaId = findRealAreaIdFromIndex(areaName, areaFiles, config);

    // 6. Montar resultado
    const result: AreaContextResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      area: {
        id: realAreaId || areaName,
        name: getAreaName(realAreaId || areaName, config),
        description: getAreaDescription(realAreaId || areaName, config),
        fileCount: areaFiles.length,
      },
      types,
      hooks,
      functions,
      components,
      services,
      stores,
      triggers,
    };

    // 7. Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatAreaContextText(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar context --area: ${message}`);
  }
}

/**
 * Encontra o ID real da área usando índice
 */
function findRealAreaIdFromIndex(
  target: string,
  areaFiles: string[],
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
  for (const filePath of areaFiles) {
    const areas = detectFileAreas(filePath, config);
    for (const areaId of areas) {
      if (areaId.toLowerCase() === targetLower || areaId.toLowerCase().includes(targetLower)) {
        detectedAreas.add(areaId);
      }
    }
  }

  return detectedAreas.size > 0 ? [...detectedAreas][0] : null;
}
