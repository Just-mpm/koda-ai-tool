/**
 * Indexador de Projeto - Parseia todos os arquivos e extrai símbolos
 *
 * Cria um índice completo do projeto que pode ser cacheado e reutilizado
 * pelos comandos find e context --area.
 */

import { readdirSync, statSync } from "fs";
import { join, extname, resolve } from "path";
import { Project, SyntaxKind } from "ts-morph";
import type { FileCategory } from "../types.js";
import { detectCategory } from "../utils/detect.js";

/**
 * Metadados de um trigger Firebase
 */
export interface TriggerInfo {
  triggerType: string; // ex: "onDocumentCreated"
  triggerPath?: string; // ex: "users/{userId}" para Firestore
  triggerSchedule?: string; // ex: "every 5 minutes" para scheduler
}

/**
 * Informação de um símbolo (função, tipo, constante, etc)
 */
export interface SymbolInfo {
  name: string;
  file: string;
  line: number;
  kind: "function" | "type" | "interface" | "enum" | "const" | "component" | "hook" | "trigger";
  signature: string;
  isExported: boolean;
  params?: string[];
  returnType?: string;
  definition?: string;
  triggerInfo?: TriggerInfo;
}

/**
 * Informação de import
 */
export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
}

/**
 * Dados extraídos de um arquivo
 */
export interface FileSymbols {
  path: string;
  category: FileCategory;
  symbols: SymbolInfo[];
  imports: ImportInfo[];
  exports: string[];
}

/**
 * Índice completo do projeto
 */
export interface ProjectIndex {
  version: string;
  timestamp: string;
  files: Record<string, FileSymbols>;
  // Índices para busca rápida
  symbolsByName: Record<string, SymbolInfo[]>;
  fileCount: number;
  symbolCount: number;
}

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
 * Firebase Cloud Functions v2 - Todos os triggers suportados
 *
 * @see https://firebase.google.com/docs/functions
 */
const FIREBASE_V2_TRIGGERS = new Set([
  // HTTPS (firebase-functions/v2/https)
  "onCall",
  "onRequest",

  // Firestore (firebase-functions/v2/firestore)
  "onDocumentCreated",
  "onDocumentCreatedWithAuthContext",
  "onDocumentUpdated",
  "onDocumentUpdatedWithAuthContext",
  "onDocumentDeleted",
  "onDocumentDeletedWithAuthContext",
  "onDocumentWritten",
  "onDocumentWrittenWithAuthContext",

  // Realtime Database (firebase-functions/v2/database)
  "onValueCreated",
  "onValueUpdated",
  "onValueDeleted",
  "onValueWritten",

  // Scheduler (firebase-functions/v2/scheduler)
  "onSchedule",

  // Storage (firebase-functions/v2/storage)
  "onObjectFinalized",
  "onObjectArchived",
  "onObjectDeleted",
  "onMetadataUpdated",

  // Pub/Sub (firebase-functions/v2/pubsub)
  "onMessagePublished",

  // Identity (firebase-functions/v2/identity)
  "beforeUserCreated",
  "beforeUserSignedIn",
  "beforeEmailSent",
  "beforeSmsSent",

  // Alerts - Crashlytics (firebase-functions/v2/alerts/crashlytics)
  "onNewFatalIssuePublished",
  "onNewNonfatalIssuePublished",
  "onNewAnrIssuePublished",
  "onRegressionAlertPublished",
  "onStabilityDigestPublished",
  "onVelocityAlertPublished",

  // Alerts - App Distribution (firebase-functions/v2/alerts/appDistribution)
  "onNewTesterIosDevicePublished",
  "onInAppFeedbackPublished",

  // Alerts - Performance (firebase-functions/v2/alerts/performance)
  "onThresholdAlertPublished",

  // Alerts - Billing (firebase-functions/v2/alerts/billing)
  "onPlanUpdatePublished",
  "onPlanAutomatedUpdatePublished",

  // Remote Config (firebase-functions/v2/remoteConfig)
  "onConfigUpdated",

  // Eventarc (firebase-functions/v2/eventarc)
  "onCustomEventPublished",

  // Tasks (firebase-functions/v2/tasks)
  "onTaskDispatched",

  // Test Lab (firebase-functions/v2/testLab)
  "onTestMatrixCompleted",
]);

/**
 * Indexa todo o projeto
 */
export function indexProject(cwd: string): ProjectIndex {
  // 1. Listar todos os arquivos
  const allFiles = getAllCodeFiles(cwd);

  // 2. Criar projeto ts-morph
  const project = createProject(cwd);

  // 3. Adicionar arquivos ao projeto
  for (const file of allFiles) {
    try {
      project.addSourceFileAtPath(resolve(cwd, file));
    } catch {
      // Ignorar arquivos que não podem ser parseados
    }
  }

  // 4. Extrair símbolos de cada arquivo
  const files: Record<string, FileSymbols> = {};
  const symbolsByName: Record<string, SymbolInfo[]> = {};
  let symbolCount = 0;

  for (const sourceFile of project.getSourceFiles()) {
    // Normalizar caminho
    let filePath = sourceFile.getFilePath().replace(/\\/g, "/");
    const cwdNormalized = cwd.replace(/\\/g, "/");
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
          const triggerName = extractFirebaseTriggerName(init);

          if (triggerName && FIREBASE_V2_TRIGGERS.has(triggerName)) {
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

/**
 * Cria projeto ts-morph
 */
function createProject(cwd: string): Project {
  try {
    return new Project({
      tsConfigFilePath: `${cwd}/tsconfig.json`,
      skipAddingFilesFromTsConfig: true,
    });
  } catch {
    return new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
      },
    });
  }
}

/**
 * Lista todos os arquivos de código
 */
function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
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
 * Infere o tipo de símbolo
 */
function inferSymbolKind(name: string, context: "function" | "const"): SymbolInfo["kind"] {
  if (name.startsWith("use") && name.length > 3 && name[3] === name[3].toUpperCase()) {
    return "hook";
  }
  if (context === "function" && name[0] === name[0].toUpperCase() && !name.includes("_")) {
    return "component";
  }
  return context === "function" ? "function" : "const";
}

/**
 * Extrai o nome do trigger Firebase de uma CallExpression
 *
 * Suporta patterns:
 * - onCall(...) - chamada direta
 * - https.onCall(...) - com namespace
 * - functions.https.onCall(...) - chain completa
 */
function extractFirebaseTriggerName(init: { getKind(): SyntaxKind; getText(): string }): string | null {
  const text = init.getText();

  // Verificar todos os triggers conhecidos
  for (const trigger of FIREBASE_V2_TRIGGERS) {
    // Pattern: trigger( ou .trigger(
    const pattern = new RegExp(`(?:^|\\.)${trigger}\\s*\\(`);
    if (pattern.test(text)) {
      return trigger;
    }
  }

  return null;
}

/**
 * Extrai metadados do trigger (path, schedule, etc)
 */
function extractTriggerInfo(init: { getText(): string }, triggerName: string): TriggerInfo {
  const text = init.getText();
  const info: TriggerInfo = { triggerType: triggerName };

  // Tentar extrair path para Firestore triggers
  // Pattern: onDocumentCreated("users/{userId}", ...)
  if (triggerName.startsWith("onDocument") || triggerName.startsWith("onValue")) {
    const pathMatch = text.match(/\(\s*["'`]([^"'`]+)["'`]/);
    if (pathMatch) {
      info.triggerPath = pathMatch[1];
    }
  }

  // Tentar extrair schedule para onSchedule
  // Pattern: onSchedule("every 5 minutes", ...) ou onSchedule({ schedule: "..." }, ...)
  if (triggerName === "onSchedule") {
    // Pattern 1: onSchedule("schedule string", ...)
    const scheduleMatch = text.match(/onSchedule\s*\(\s*["'`]([^"'`]+)["'`]/);
    if (scheduleMatch) {
      info.triggerSchedule = scheduleMatch[1];
    } else {
      // Pattern 2: onSchedule({ schedule: "..." }, ...)
      const objectScheduleMatch = text.match(/schedule\s*:\s*["'`]([^"'`]+)["'`]/);
      if (objectScheduleMatch) {
        info.triggerSchedule = objectScheduleMatch[1];
      }
    }
  }

  // Tentar extrair bucket para Storage triggers
  if (triggerName.startsWith("onObject") || triggerName === "onMetadataUpdated") {
    const bucketMatch = text.match(/bucket\s*:\s*["'`]([^"'`]+)["'`]/);
    if (bucketMatch) {
      info.triggerPath = bucketMatch[1];
    }
  }

  return info;
}

/**
 * Simplifica tipos longos
 */
function simplifyType(typeText: string): string {
  if (!typeText) return "unknown";
  let simplified = typeText.replace(/import\([^)]+\)\./g, "");
  if (simplified.length > 80) {
    simplified = simplified.slice(0, 77) + "...";
  }
  return simplified;
}

/**
 * Obtém texto do tipo de forma segura (evita erro de escapedName)
 */
function safeGetTypeText(getTypeFn: () => { getText(): string }): string {
  try {
    const type = getTypeFn();
    if (!type) return "unknown";
    return type.getText();
  } catch {
    return "unknown";
  }
}

/**
 * Obtém return type de forma segura
 */
function safeGetReturnType(node: { getReturnType(): { getText(): string } }): string {
  try {
    const returnType = node.getReturnType();
    if (!returnType) return "unknown";
    return returnType.getText();
  } catch {
    return "unknown";
  }
}

/**
 * Trunca código
 */
function truncateCode(code: string, maxLen: number): string {
  const oneLine = code.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 3) + "...";
}

/**
 * Formata definição de interface
 */
function formatInterfaceDefinition(iface: {
  getProperties(): { getName(): string; getType(): { getText(): string } }[];
  getExtends(): { getText(): string }[];
}): string {
  const parts: string[] = [];

  const extendsClauses = iface.getExtends();
  if (extendsClauses.length > 0) {
    parts.push(`extends ${extendsClauses.map((e) => e.getText()).join(", ")}`);
  }

  const props = iface.getProperties();
  for (const prop of props.slice(0, 10)) {
    const propType = simplifyType(safeGetTypeText(() => prop.getType()));
    parts.push(`${prop.getName()}: ${propType}`);
  }

  if (props.length > 10) {
    parts.push(`... +${props.length - 10} props`);
  }

  return parts.length > 0 ? `{ ${parts.join("; ")} }` : "{}";
}
