/**
 * Utilitários para detecção de Firebase Cloud Functions
 *
 * Resolve falsos positivos onde arquivos em functions/src/ são marcados
 * como "órfãos" pelo Knip, mas na verdade são exportados via index.ts
 * e deployados como Cloud Functions.
 */

import { existsSync, readFileSync } from "fs";
import { join, relative, normalize } from "path";

/**
 * Cache do conteúdo do index.ts para evitar leituras repetidas
 */
let indexContentCache: { cwd: string; content: string; exports: Set<string> } | null = null;

/**
 * Detecta se é um projeto Firebase (via .firebaserc ou firebase.json)
 */
export function isFirebaseProject(cwd: string): boolean {
  const firebaserc = join(cwd, ".firebaserc");
  const firebaseJson = join(cwd, "firebase.json");
  return existsSync(firebaserc) || existsSync(firebaseJson);
}

/**
 * Detecta se o projeto tem Firebase Cloud Functions
 */
export function hasFirebaseFunctions(cwd: string): boolean {
  // Primeiro verifica se é um projeto Firebase
  if (!isFirebaseProject(cwd)) {
    return false;
  }

  // Depois verifica se tem o index.ts das functions
  const functionsIndexPath = join(cwd, "functions", "src", "index.ts");
  return existsSync(functionsIndexPath);
}

/**
 * Lê e parseia os exports do functions/src/index.ts
 *
 * Detecta padrões como:
 * - export { foo } from "./foo"
 * - export { foo } from "./foo.js"
 * - export * from "./foo"
 * - export { default as foo } from "./foo"
 */
export function getFunctionsExports(cwd: string): Set<string> {
  const functionsIndexPath = join(cwd, "functions", "src", "index.ts");

  // Usar cache se disponível
  if (indexContentCache && indexContentCache.cwd === cwd) {
    return indexContentCache.exports;
  }

  if (!existsSync(functionsIndexPath)) {
    return new Set();
  }

  try {
    const content = readFileSync(functionsIndexPath, "utf-8");
    const exports = new Set<string>();

    // Padrão 1: export { foo } from "./foo" ou export { foo } from "./foo.js"
    // Captura o path do módulo
    const namedExportRegex = /export\s*\{[^}]+\}\s*from\s*["']\.\/([^"']+)["']/g;
    let match: RegExpExecArray | null;

    while ((match = namedExportRegex.exec(content)) !== null) {
      const modulePath = match[1].replace(/\.js$/, "").replace(/\.ts$/, "");
      exports.add(modulePath);
    }

    // Padrão 2: export * from "./foo"
    const starExportRegex = /export\s*\*\s*from\s*["']\.\/([^"']+)["']/g;

    while ((match = starExportRegex.exec(content)) !== null) {
      const modulePath = match[1].replace(/\.js$/, "").replace(/\.ts$/, "");
      exports.add(modulePath);
    }

    // Padrão 3: import e re-export manual
    // import { foo } from "./foo"; exports.foo = foo;
    const importRegex = /import\s*(?:\{[^}]+\}|\*\s+as\s+\w+)\s*from\s*["']\.\/([^"']+)["']/g;

    while ((match = importRegex.exec(content)) !== null) {
      const modulePath = match[1].replace(/\.js$/, "").replace(/\.ts$/, "");
      exports.add(modulePath);
    }

    // Salvar no cache
    indexContentCache = { cwd, content, exports };

    return exports;
  } catch {
    return new Set();
  }
}

/**
 * Verifica se um arquivo é uma Cloud Function exportada no index.ts
 */
export function isExportedCloudFunction(filePath: string, cwd: string): boolean {
  const normalized = normalize(filePath).replace(/\\/g, "/");

  // Verificar se está em functions/src/
  if (!normalized.includes("functions/src/")) {
    return false;
  }

  // Ignorar o próprio index.ts
  if (normalized.endsWith("functions/src/index.ts")) {
    return false;
  }

  // Extrair o nome do módulo relativo a functions/src/
  const functionsDir = join(cwd, "functions", "src");
  const relativePath = relative(functionsDir, join(cwd, filePath))
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "")
    .replace(/\.js$/, "");

  // Verificar se está exportado no index.ts
  const exports = getFunctionsExports(cwd);

  // Verificar match direto
  if (exports.has(relativePath)) {
    return true;
  }

  // Verificar se é um arquivo dentro de uma pasta exportada
  // Ex: se exports tem "utils" e o arquivo é "utils/helper.ts"
  const parts = relativePath.split("/");
  if (parts.length > 1 && exports.has(parts[0])) {
    return true;
  }

  return false;
}

/**
 * Filtra arquivos órfãos removendo falsos positivos de Cloud Functions
 *
 * @param files - Lista de arquivos marcados como órfãos pelo Knip
 * @param cwd - Diretório do projeto
 * @returns Lista filtrada sem os falsos positivos
 */
export function filterCloudFunctionsFalsePositives(
  files: string[],
  cwd: string
): { filtered: string[]; excluded: string[] } {
  if (!hasFirebaseFunctions(cwd)) {
    return { filtered: files, excluded: [] };
  }

  const filtered: string[] = [];
  const excluded: string[] = [];

  for (const file of files) {
    if (isExportedCloudFunction(file, cwd)) {
      excluded.push(file);
    } else {
      filtered.push(file);
    }
  }

  return { filtered, excluded };
}

/**
 * Limpa o cache (útil para testes ou quando o index.ts muda)
 */
export function clearFirebaseCache(): void {
  indexContentCache = null;
}
