/**
 * Indexador Principal - Funções Auxiliares
 *
 * Funções auxiliares compartilhadas pelos módulos de cache e triggers.
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { Project } from "ts-morph";
import { logger } from "../utils/logger.js";

/**
 * Pastas a ignorar durante a indexação
 */
export const IGNORED_DIRS = new Set([
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
  // Firebase Functions output
  "functions/lib",
  "lib",
  // Outros outputs comuns
  ".output",
  "out",
  ".firebase",
  "firebase-debug.log",
  "firestore-debug.log",
  "pubsub-debug.log",
]);

/**
 * Extensões de código suportadas
 */
export const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);



/**
 * Constrói mapa de imports do arquivo
 *
 * Mapeia nomes de variáveis locais para suas informações de import,
 * incluindo o nome original e o módulo de origem.
 *
 * @param sourceFile - Arquivo fonte do ts-morph
 * @returns Mapa de nome local → { nome, módulo }
 */
export function buildImportMap(sourceFile: any): Map<string, { name: string; module: string }> {
  const map = new Map<string, { name: string; module: string }>();

  // Type guard simples pois sourceFile é any/complexo aqui
  if (!sourceFile.getImportDeclarations) return map;

  for (const decl of sourceFile.getImportDeclarations()) {
    const module = decl.getModuleSpecifierValue();

    // Namespace: import * as v2 from ...
    const ns = decl.getNamespaceImport();
    if (ns) {
      map.set(ns.getText(), { name: "*", module });
    }

    // Named: import { onCall, onRequest as req } ...
    for (const named of decl.getNamedImports()) {
      const alias = named.getAliasNode();
      const name = named.getName();
      const localName = alias ? alias.getText() : name;
      map.set(localName, { name, module });
    }

    // Default: import func from ...
    const def = decl.getDefaultImport();
    if (def) {
      map.set(def.getText(), { name: "default", module });
    }
  }
  return map;
}

/**
 * Cria projeto ts-morph
 *
 * Sempre usa skipAddingFilesFromTsConfig=true porque:
 * 1. O tsconfig pode ter "files": [] (project references)
 * 2. O tsconfig pode excluir a pasta functions/
 * 3. Nós adicionamos os arquivos manualmente via getAllCodeFiles
 *
 * @param cwd - Diretório de trabalho do projeto
 * @returns Instância do Project do ts-morph
 */
export function createProject(cwd: string): Project {
  // Criar projeto SEM depender do tsconfig para inclusão de arquivos
  // O tsconfig é usado apenas para compilerOptions (paths, strict, etc)
  try {
    const project = new Project({
      tsConfigFilePath: `${cwd}/tsconfig.json`,
      skipAddingFilesFromTsConfig: true,
    });

    logger.debug(`Projeto ts-morph criado com tsconfig: ${cwd}/tsconfig.json`);
    return project;
  } catch {
    // Fallback se não conseguir ler o tsconfig
    logger.debug(`Falha ao ler tsconfig, criando projeto básico`);
    return new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
        target: 2, // ES2020
        module: 200, // ESNext
        moduleResolution: 100, // Bundler
      },
    });
  }
}

/**
 * Lista todos os arquivos de código recursivamente
 *
 * Percorre o diretório e seus subdiretórios, ignorando
 * pastas em IGNORED_DIRS e arquivos sem extensões suportadas.
 *
 * @param dir - Diretório para percorrer
 * @param files - Array acumulador de arquivos (uso interno)
 * @param baseDir - Diretório base para caminhos relativos (uso interno)
 * @returns Lista de caminhos relativos dos arquivos de código
 */
export function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

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
            const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, "/");
            files.push(relativePath);
          }
        }
      } catch {
        // Ignorar
      }
    }
  } catch {
    // Ignorar
  }

  return files;
}

/**
 * Infere o tipo de símbolo baseado no nome e contexto
 *
 * @param name - Nome do símbolo
 * @param context - Contexto do símbolo ("function" ou "const")
 * @returns Tipo do símbolo inferido
 */
export function inferSymbolKind(name: string, context: "function" | "const"): "function" | "type" | "interface" | "enum" | "const" | "component" | "hook" | "trigger" {
  // Detectar hooks React (use...)
  if (name.startsWith("use") && name.length > 3 && name[3] === name[3].toUpperCase()) {
    return "hook";
  }
  // Detectar componentes React (Nome começa com maiúscula e não tem underscore)
  if (context === "function" && name[0] === name[0].toUpperCase() && !name.includes("_")) {
    return "component";
  }
  // Padrão padrão
  return context === "function" ? "function" : "const";
}

/**
 * Obtém return type de forma segura
 *
 * @param node - Nó AST com método getReturnType
 * @returns Texto do return type ou "unknown" se falhar
 */
export function safeGetReturnType(node: { getReturnType(): { getText(): string } }): string {
  try {
    const returnType = node.getReturnType();
    if (!returnType) return "unknown";
    return returnType.getText();
  } catch {
    return "unknown";
  }
}

/**
 * Trunca código para exibição em assinaturas
 *
 * Remove quebras de linha e espaços extras, então
 * trunca se exceder o tamanho máximo.
 *
 * @param code - Código para truncar
 * @param maxLen - Tamanho máximo do resultado
 * @returns Código truncado
 */
export function truncateCode(code: string, maxLen: number): string {
  const oneLine = code.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 3) + "...";
}
