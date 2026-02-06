/**
 * Cache de Símbolos do Projeto
 *
 * Indexa todos os arquivos do projeto e extrai símbolos
 * (funções, tipos, interfaces, enums, componentes, hooks, triggers Firebase)
 *
 * O índice resultante pode ser cacheado e reutilizado pelos comandos find e context.
 */

import { resolve } from "path";
import { SyntaxKind } from "ts-morph";
import type { FileCategory } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { simplifyType, safeGetTypeText, formatInterfaceDefinition } from "./utils.js";
import {
  buildImportMap,
  getAllCodeFiles,
  createProject,
  inferSymbolKind,
  truncateCode,
  safeGetReturnType,
} from "./index.js";
import { logger } from "../utils/logger.js";
import {
  FIREBASE_V2_TRIGGERS,
  extractFirebaseTriggerName,
  extractTriggerInfo,
  type TriggerInfo,
} from "./triggers.js";

/**
 * Informação de um símbolo (função, tipo, constante, etc)
 */
export interface SymbolInfo {
  /** Nome do símbolo */
  name: string;
  /** Caminho do arquivo relativo ao projeto */
  file: string;
  /** Número da linha onde o símbolo está definido */
  line: number;
  /** Tipo do símbolo */
  kind: "function" | "type" | "interface" | "enum" | "const" | "component" | "hook" | "trigger";
  /** Assinatura do símbolo */
  signature: string;
  /** Se o símbolo é exportado */
  isExported: boolean;
  /** Parâmetros da função (se aplicável) */
  params?: string[];
  /** Tipo de retorno da função (se aplicável) */
  returnType?: string;
  /** Definição completa (para tipos, interfaces, enums) */
  definition?: string;
  /** Metadados específicos para triggers Firebase */
  triggerInfo?: TriggerInfo;
}

/**
 * Informação de import
 */
export interface ImportInfo {
  /** Caminho do módulo importado */
  source: string;
  /** Especificadores importados */
  specifiers: string[];
  /** Se é um import type-only */
  isTypeOnly: boolean;
}

/**
 * Dados extraídos de um arquivo
 */
export interface FileSymbols {
  /** Caminho do arquivo relativo ao projeto */
  path: string;
  /** Categoria do arquivo (component, page, hook, etc) */
  category: FileCategory;
  /** Lista de símbolos encontrados no arquivo */
  symbols: SymbolInfo[];
  /** Lista de imports do arquivo */
  imports: ImportInfo[];
  /** Lista de exports do arquivo */
  exports: string[];
}

/**
 * Índice completo do projeto
 */
export interface ProjectIndex {
  /** Versão do formato do índice */
  version: string;
  /** Timestamp de quando o índice foi criado */
  timestamp: string;
  /** Mapa de caminho → dados do arquivo */
  files: Record<string, FileSymbols>;
  /** Índice para busca rápida por nome do símbolo */
  symbolsByName: Record<string, SymbolInfo[]>;
  /** Número total de arquivos indexados */
  fileCount: number;
  /** Número total de símbolos encontrados */
  symbolCount: number;
}



/**
 * Indexa todo o projeto e extrai todos os símbolos
 *
 * @param cwd - Diretório de trabalho do projeto
 * @returns Índice completo do projeto
 */
export function indexProject(cwd?: string): ProjectIndex {
  // Garantir que cwd nunca seja undefined
  const resolvedCwd = cwd || process.cwd();

  // 1. Listar todos os arquivos
  const allFiles = getAllCodeFiles(resolvedCwd);
  logger.debug(`Indexando ${allFiles.length} arquivos em ${resolvedCwd}`);

  // Contar arquivos em functions/src/ para diagnóstico
  const functionFiles = allFiles.filter((f) => f.includes("functions/src/"));
  if (functionFiles.length > 0) {
    logger.debug(`Encontrados ${functionFiles.length} arquivos em functions/src/:`, functionFiles);
    logger.debugFunctions(`Arquivos em functions/src/:`);
    functionFiles.forEach((f) => logger.debugFunctions(`  - ${f}`));
  }

  // 2. Criar projeto ts-morph
  const project = createProject(resolvedCwd);

  // 3. Adicionar arquivos ao projeto
  let addedCount = 0;
  let errorCount = 0;
  for (const file of allFiles) {
    try {
      project.addSourceFileAtPath(resolve(resolvedCwd, file));
      addedCount++;
    } catch {
      // Ignorar arquivos que não podem ser parseados
      errorCount++;
      if (file.includes("functions/src/")) {
        logger.debug(`[indexer] Erro ao adicionar: ${file}`);
      }
    }
  }

  logger.debug(`[indexer] Total de arquivos encontrados: ${allFiles.length}`);
  logger.debug(`[indexer] Arquivos adicionados ao projeto: ${addedCount}`);
  logger.debug(`[indexer] Arquivos com erro: ${errorCount}`);
  logger.debug(`[indexer] SourceFiles no projeto: ${project.getSourceFiles().length}`);

  // Verificar se functions/src foi adicionado
  const functionsInProject = project.getSourceFiles().filter((sf) =>
    sf.getFilePath().includes("functions/src/")
  );
  logger.debugFunctions(`[indexer] Arquivos functions/src/ no projeto: ${functionsInProject.length}`);
  functionsInProject.forEach((sf) => {
    logger.debugFunctions(`  - ${sf.getFilePath()}`);
  });

  // 4. Extrair símbolos de cada arquivo
  const files: Record<string, FileSymbols> = {};
  const symbolsByName: Record<string, SymbolInfo[]> = {};
  let symbolCount = 0;

  for (const sourceFile of project.getSourceFiles()) {
    // Normalizar caminho
    let filePath = sourceFile.getFilePath().replace(/\\/g, "/");
    const cwdNormalized = resolvedCwd.replace(/\\/g, "/");
    if (filePath.startsWith(cwdNormalized + "/")) {
      filePath = filePath.slice(cwdNormalized.length + 1);
    } else if (filePath.startsWith(cwdNormalized)) {
      filePath = filePath.slice(cwdNormalized.length);
    }

    // Ignorar arquivos fora do projeto (node_modules, etc)
    if (filePath.includes("node_modules")) continue;

    const category = detectCategory(filePath);
    const symbols: SymbolInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: string[] = [];

    // Extrair imports
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifiers: string[] = [];

      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        specifiers.push(defaultImport.getText());
      }

      for (const namedImport of importDecl.getNamedImports()) {
        specifiers.push(namedImport.getName());
      }

      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        specifiers.push(`* as ${namespaceImport.getText()}`);
      }

      imports.push({
        source: importDecl.getModuleSpecifierValue(),
        specifiers,
        isTypeOnly: importDecl.isTypeOnly(),
      });
    }

    // Extrair funções
    for (const func of sourceFile.getFunctions()) {
      const name = func.getName();
      if (!name) continue;

      const isExported = func.isExported();
      const params = func.getParameters().map((p) => p.getName());
      const returnType = simplifyType(safeGetReturnType(func));
      const kind = inferSymbolKind(name, "function");

      const symbol: SymbolInfo = {
        name,
        file: filePath,
        line: func.getStartLineNumber(),
        kind,
        signature: `${isExported ? "export " : ""}${func.isAsync() ? "async " : ""}function ${name}(${params.join(", ")})`,
        isExported,
        params,
        returnType,
      };

      symbols.push(symbol);

      // Adicionar ao índice por nome
      if (!symbolsByName[name]) {
        symbolsByName[name] = [];
      }
      symbolsByName[name].push(symbol);

      if (isExported) {
        exports.push(name);
      }
    }

    // Extrair arrow functions e function expressions
    for (const varStatement of sourceFile.getVariableStatements()) {
      const isExported = varStatement.isExported();

      for (const varDecl of varStatement.getDeclarations()) {
        const name = varDecl.getName();
        const init = varDecl.getInitializer();
        if (!init) continue;

        const initKind = init.getKind();
        const initKindName = init.getKindName();

        // Debug: mostrar tipo de initializer em functions/src/
        if (filePath.includes("functions/src/")) {
          logger.debugFunctions(`[kind] ${name}: ${initKindName} (kind=${initKind})`);
        }

        // Arrow function ou function expression
        if (initKind === SyntaxKind.ArrowFunction || initKind === SyntaxKind.FunctionExpression) {
          const funcLike = init.asKind(SyntaxKind.ArrowFunction) || init.asKind(SyntaxKind.FunctionExpression);
          if (!funcLike) continue;

          const params = funcLike.getParameters().map((p) => p.getName());
          const returnType = simplifyType(safeGetReturnType(funcLike));
          const kind = inferSymbolKind(name, "function");

          const symbol: SymbolInfo = {
            name,
            file: filePath,
            line: varDecl.getStartLineNumber(),
            kind,
            signature: `${isExported ? "export " : ""}const ${name} = (${params.join(", ")}) => ...`,
            isExported,
            params,
            returnType,
          };

          symbols.push(symbol);

          if (!symbolsByName[name]) {
            symbolsByName[name] = [];
          }
          symbolsByName[name].push(symbol);

          if (isExported) {
            exports.push(name);
          }
        }
        // CallExpression - pode ser trigger Firebase (onCall, onDocumentCreated, etc)
        else if (initKind === SyntaxKind.CallExpression) {
          const importMap = buildImportMap(sourceFile);

          // Debug: mostrar imports detectados
          if (filePath.includes("functions/src/")) {
            const initText = init.getText().slice(0, 100).replace(/\s+/g, " ");
            logger.debugFunctions(`\n[CallExpression] ${filePath}:${varDecl.getStartLineNumber()}`);
            logger.debugFunctions(`  Variável: ${name}`);
            logger.debugFunctions(`  Código: ${initText}...`);
            logger.debugFunctions(`  Imports encontrados: ${importMap.size}`);
            importMap.forEach((info, key) => {
              logger.debugFunctions(`    - ${key} -> ${info.name} from ${info.module}`);
            });
          }

          const triggerName = extractFirebaseTriggerName(init, filePath, name, importMap);

          // Debug: mostrar CallExpressions em arquivos de functions
          if (filePath.includes("functions/src/")) {
            if (triggerName) {
              logger.debugFunctions(`  ✓✓✓ Trigger FINAL detectado: ${triggerName}`);
            } else {
              logger.debugFunctions(`  ✗✗✗ Nenhum trigger detectado para: ${name}`);
            }
          }

          if (triggerName && FIREBASE_V2_TRIGGERS.has(triggerName as any)) {
            // É um trigger Firebase!
            const triggerInfo = extractTriggerInfo(init, triggerName);

            const symbol: SymbolInfo = {
              name,
              file: filePath,
              line: varDecl.getStartLineNumber(),
              kind: "trigger",
              signature: `${isExported ? "export " : ""}const ${name} = ${triggerName}(...)`,
              isExported,
              triggerInfo,
            };

            symbols.push(symbol);

            if (!symbolsByName[name]) {
              symbolsByName[name] = [];
            }
            symbolsByName[name].push(symbol);

            if (isExported) {
              exports.push(name);
            }
          } else {
            // CallExpression mas não é trigger Firebase - tratar como const
            const declKind = varStatement.getDeclarationKind();
            if (declKind.toString() === "const") {
              const symbol: SymbolInfo = {
                name,
                file: filePath,
                line: varDecl.getStartLineNumber(),
                kind: "const",
                signature: `${isExported ? "export " : ""}const ${name} = ${truncateCode(init.getText(), 40)}`,
                isExported,
              };

              symbols.push(symbol);

              if (!symbolsByName[name]) {
                symbolsByName[name] = [];
              }
              symbolsByName[name].push(symbol);

              if (isExported) {
                exports.push(name);
              }
            }
          }
        }
        // Constante (não função e não CallExpression)
        else {
          const declKind = varStatement.getDeclarationKind();
          if (declKind.toString() !== "const") continue;

          const symbol: SymbolInfo = {
            name,
            file: filePath,
            line: varDecl.getStartLineNumber(),
            kind: "const",
            signature: `${isExported ? "export " : ""}const ${name} = ${truncateCode(init.getText(), 40)}`,
            isExported,
          };

          symbols.push(symbol);

          if (!symbolsByName[name]) {
            symbolsByName[name] = [];
          }
          symbolsByName[name].push(symbol);

          if (isExported) {
            exports.push(name);
          }
        }
      }
    }

    // Extrair interfaces
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      const isExported = iface.isExported();

      const symbol: SymbolInfo = {
        name,
        file: filePath,
        line: iface.getStartLineNumber(),
        kind: "interface",
        signature: `${isExported ? "export " : ""}interface ${name}`,
        isExported,
        definition: formatInterfaceDefinition(iface),
      };

      symbols.push(symbol);

      if (!symbolsByName[name]) {
        symbolsByName[name] = [];
      }
      symbolsByName[name].push(symbol);

      if (isExported) {
        exports.push(name);
      }
    }

    // Extrair type aliases
    for (const typeAlias of sourceFile.getTypeAliases()) {
      const name = typeAlias.getName();
      const isExported = typeAlias.isExported();

      const symbol: SymbolInfo = {
        name,
        file: filePath,
        line: typeAlias.getStartLineNumber(),
        kind: "type",
        signature: `${isExported ? "export " : ""}type ${name}`,
        isExported,
        definition: simplifyType(safeGetTypeText(() => typeAlias.getType())),
      };

      symbols.push(symbol);

      if (!symbolsByName[name]) {
        symbolsByName[name] = [];
      }
      symbolsByName[name].push(symbol);

      if (isExported) {
        exports.push(name);
      }
    }

    // Extrair enums
    for (const enumDecl of sourceFile.getEnums()) {
      const name = enumDecl.getName();
      const isExported = enumDecl.isExported();

      const symbol: SymbolInfo = {
        name,
        file: filePath,
        line: enumDecl.getStartLineNumber(),
        kind: "enum",
        signature: `${isExported ? "export " : ""}enum ${name}`,
        isExported,
        definition: enumDecl.getMembers().map((m) => m.getName()).join(" | "),
      };

      symbols.push(symbol);

      if (!symbolsByName[name]) {
        symbolsByName[name] = [];
      }
      symbolsByName[name].push(symbol);

      if (isExported) {
        exports.push(name);
      }
    }

    symbolCount += symbols.length;

    files[filePath] = {
      path: filePath,
      category,
      symbols,
      imports,
      exports,
    };
  }

  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    files,
    symbolsByName,
    fileCount: Object.keys(files).length,
    symbolCount,
  };
}
