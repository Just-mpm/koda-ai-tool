/**
 * Comando FUNCTIONS - Lista todas as Cloud Functions do projeto
 *
 * Agrupa por tipo de trigger e mostra metadados relevantes.
 * Detecta automaticamente projetos Firebase e extrai informações
 * de triggers como path (Firestore) e schedule (cron).
 */

import { hasFirebaseFunctions, isFirebaseProject } from "../utils/firebase.js";
import { indexProject, type ProjectIndex } from "../ts/cache.js";
import {
  isCacheValid,
  getCachedSymbolsIndex,
  cacheSymbolsIndex,
  updateCacheMeta,
} from "../cache/index.js";

/**
 * Informação de uma Cloud Function
 */
export interface CloudFunctionInfo {
  name: string;
  file: string;
  line: number;
  triggerType: string;
  triggerPath?: string;
  triggerSchedule?: string;
  isExported: boolean;
}

/**
 * Resultado do comando functions
 */
export interface FunctionsResult {
  version: string;
  timestamp: string;
  cwd: string;
  isFirebaseProject: boolean;
  hasFunctions: boolean;
  functions: CloudFunctionInfo[];
  byTrigger: Record<string, CloudFunctionInfo[]>;
  summary: {
    total: number;
    exported: number;
    byTrigger: Record<string, number>;
  };
}

/**
 * Opções do comando functions
 */
export interface FunctionsOptions {
  cwd?: string;
  format?: "text" | "json";
  cache?: boolean;
  trigger?: string; // Filtrar por tipo de trigger
}

/**
 * Executa o comando FUNCTIONS
 */
export async function functions(options: FunctionsOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false;
  const filterTrigger = options.trigger;

  // Verificar se é projeto Firebase
  if (!isFirebaseProject(cwd)) {
    const errorMsg = "Este nao e um projeto Firebase (nao encontrou .firebaserc ou firebase.json)";
    if (format === "json") {
      return JSON.stringify({ error: errorMsg });
    }
    let out = `❌ ${errorMsg}\n`;
    out += `\n💡 Comandos disponiveis para este projeto:\n`;
    out += `   → ai-tool map - ver estrutura do projeto\n`;
    out += `   → ai-tool find <termo> - buscar simbolos no codigo\n`;
    out += `   → ai-tool areas - listar areas funcionais\n`;
    return out;
  }

  if (!hasFirebaseFunctions(cwd)) {
    const errorMsg = "Projeto Firebase detectado, mas sem Cloud Functions";
    if (format === "json") {
      return JSON.stringify({ error: errorMsg });
    }
    let out = `❌ ${errorMsg}\n`;
    out += `   Nao foi encontrado functions/src/index.ts\n\n`;
    out += `💡 Para adicionar Cloud Functions:\n`;
    out += `   → firebase init functions\n`;
    out += `   → Documentacao: https://firebase.google.com/docs/functions\n`;
    return out;
  }

  try {
    // Obter índice
    let index: ProjectIndex;

    if (useCache && isCacheValid(cwd)) {
      const cached = getCachedSymbolsIndex<ProjectIndex>(cwd);
      if (cached && cached.symbolsByName) {
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

    // Filtrar arquivos em functions/src/
    const functionFiles = Object.values(index.files).filter(f => f.path.includes("functions/src/"));

    // Extrair Cloud Functions (símbolos com kind === "trigger")
    const funcs: CloudFunctionInfo[] = [];

    for (const fileData of functionFiles) {
      for (const symbol of fileData.symbols) {
        if (symbol.kind === "trigger") {
          funcs.push({
            name: symbol.name,
            file: symbol.file,
            line: symbol.line,
            triggerType: symbol.triggerInfo?.triggerType || "unknown",
            triggerPath: symbol.triggerInfo?.triggerPath,
            triggerSchedule: symbol.triggerInfo?.triggerSchedule,
            isExported: symbol.isExported,
          });
        }
      }
    }

    // Filtrar por trigger se especificado
    const filtered = filterTrigger
      ? funcs.filter((f) =>
          f.triggerType.toLowerCase().includes(filterTrigger.toLowerCase())
        )
      : funcs;

    // Agrupar por tipo de trigger
    const byTrigger: Record<string, CloudFunctionInfo[]> = {};
    const triggerCounts: Record<string, number> = {};

    for (const func of filtered) {
      if (!byTrigger[func.triggerType]) {
        byTrigger[func.triggerType] = [];
        triggerCounts[func.triggerType] = 0;
      }
      byTrigger[func.triggerType].push(func);
      triggerCounts[func.triggerType]++;
    }

    const result: FunctionsResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      cwd,
      isFirebaseProject: true,
      hasFunctions: true,
      functions: filtered,
      byTrigger,
      summary: {
        total: filtered.length,
        exported: filtered.filter((f) => f.isExported).length,
        byTrigger: triggerCounts,
      },
    };

    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatFunctionsText(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar functions: ${message}`);
  }
}

/**
 * Formata resultado em texto
 */
function formatFunctionsText(result: FunctionsResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    ⚡ CLOUD FUNCTIONS                        ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Total: ${result.summary.total} functions\n`;
  out += `   Exportadas: ${result.summary.exported}\n`;
  
  if (result.summary.total > 0) {
    out += `\n   💡 Filtros disponíveis:\n`;
    out += `      ai-tool functions --trigger=onCall\n`;
    out += `      ai-tool functions --trigger=onDocumentCreated\n`;
  }
  out += `\n`;

  if (result.summary.total === 0) {
    out += `   ⚠️  NENHUMA CLOUD FUNCTION DETECTADA\n\n`;
    out += `   Possíveis causas:\n`;
    out += `      1. O projeto não é Firebase (não encontrou .firebaserc ou firebase.json)\n`;
    out += `      2. Não há arquivo functions/src/index.ts\n`;
    out += `      3. Os triggers não usam padrões v2 (onCall, onDocumentCreated, etc)\n`;
    out += `      4. O cache está desatualizado (ex: atualizou o ai-tool recentemente)\n`;
    out += `         → Tente: ai-tool functions --no-cache\n\n`;
    out += `   Padrões suportados:\n`;
    out += `      export const minhaFunc = onCall((request) => { ... })\n`;
    out += `      export const minhaFunc = onDocumentCreated("path", (event) => { ... })\n\n`;
    out += `   Documentação: https://firebase.google.com/docs/functions\n`;
    return out;
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Ordem de exibição dos triggers
  const triggerOrder = [
    // HTTPS
    "onCall",
    "onRequest",
    // Firestore
    "onDocumentCreated",
    "onDocumentCreatedWithAuthContext",
    "onDocumentUpdated",
    "onDocumentUpdatedWithAuthContext",
    "onDocumentDeleted",
    "onDocumentDeletedWithAuthContext",
    "onDocumentWritten",
    "onDocumentWrittenWithAuthContext",
    // Realtime Database
    "onValueCreated",
    "onValueUpdated",
    "onValueDeleted",
    "onValueWritten",
    // Scheduler
    "onSchedule",
    // Storage
    "onObjectFinalized",
    "onObjectArchived",
    "onObjectDeleted",
    "onMetadataUpdated",
    // Pub/Sub
    "onMessagePublished",
    // Identity
    "beforeUserCreated",
    "beforeUserSignedIn",
  ];

  // Ordenar triggers
  const sortedTriggers = Object.keys(result.byTrigger).sort((a, b) => {
    const aIdx = triggerOrder.indexOf(a);
    const bIdx = triggerOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  for (const trigger of sortedTriggers) {
    const funcs = result.byTrigger[trigger];
    const icon = getTriggerIcon(trigger);

    out += `${icon} ${trigger} (${funcs.length})\n\n`;

    for (const func of funcs) {
      const exportTag = func.isExported ? "" : " [não exportada]";
      out += `   ${func.name}${exportTag}\n`;
      out += `      📁 ${func.file}:${func.line}\n`;
      if (func.triggerPath) {
        out += `      📍 path: ${func.triggerPath}\n`;
      }
      if (func.triggerSchedule) {
        out += `      ⏰ schedule: ${func.triggerSchedule}\n`;
      }
    }
    out += `\n`;
  }

  return out;
}

/**
 * Retorna ícone para cada tipo de trigger
 */
function getTriggerIcon(trigger: string): string {
  if (trigger.includes("Call") || trigger.includes("Request")) return "🌐";
  if (trigger.includes("Document") || trigger.includes("Value")) return "🔥";
  if (trigger.includes("Schedule")) return "⏰";
  if (trigger.includes("Object") || trigger.includes("Metadata")) return "📦";
  if (trigger.includes("Message") || trigger.includes("Pub")) return "📨";
  if (trigger.includes("User") || trigger.includes("before")) return "👤";
  if (trigger.includes("Alert") || trigger.includes("Issue")) return "🚨";
  if (trigger.includes("Config")) return "⚙️";
  if (trigger.includes("Task")) return "📋";
  if (trigger.includes("Test")) return "🧪";
  return "⚡";
}
