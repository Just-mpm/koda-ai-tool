/**
 * Comando CONTEXT - Extrai assinaturas de funcoes e tipos de um arquivo
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve, basename, extname } from "path";
import type { ContextOptions, ContextResult } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatContextText } from "../formatters/text.js";
import {
  createProject,
  addSourceFile,
  extractImports,
  extractFunctions,
  extractTypes,
  extractExports,
} from "../ts/extractor.js";
import { formatFileNotFound } from "../utils/errors.js";

/**
 * Executa o comando CONTEXT
 */
export async function context(target: string, options: ContextOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";

  if (!target) {
    throw new Error("Target e obrigatorio. Exemplo: ai-tool context src/components/Button.tsx");
  }

  try {
    // 1. Encontrar arquivo target
    const targetPath = findTargetFile(target, cwd);

    if (!targetPath) {
      return formatNotFound(target, cwd);
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
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatContextText(result);
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

/**
 * Formata mensagem de "nao encontrado"
 * Usa módulo compartilhado com sugestões "você quis dizer?"
 */
function formatNotFound(target: string, cwd: string): string {
  const allFiles = getAllCodeFiles(cwd);
  return formatFileNotFound({ target, allFiles, command: "context" });
}
