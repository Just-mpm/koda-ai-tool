/**
 * Detecção de Triggers Firebase
 *
 * Identifica e extrai informações de Cloud Functions v2 do Firebase
 * (onCall, onDocumentCreated, onSchedule, etc) durante a indexação do projeto.
 */

import { Node } from "ts-morph";
import { logger } from "../utils/logger.js";

/**
 * Firebase Cloud Functions v2 - Todos os triggers suportados
 *
 * @see https://firebase.google.com/docs/functions
 */
export const FIREBASE_V2_TRIGGERS = new Set([
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
] as const);

/**
 * Metadados de um trigger Firebase
 */
export interface TriggerInfo {
  /** Tipo do trigger (ex: "onDocumentCreated", "onCall") */
  triggerType: string;
  /** Path para Firestore/RTDB (ex: "users/{userId}") */
  triggerPath?: string;
  /** Schedule expression para onSchedule (ex: "every 5 minutes") */
  triggerSchedule?: string;
}



/**
 * Extrai o nome do trigger Firebase de uma CallExpression
 *
 * Suporta patterns:
 * - onCall(...) - chamada direta
 * - https.onCall(...) - com namespace
 * - functions.https.onCall(...) - chain completa
 * - v2.https.onCall(...) - com import v2
 * - onCall<{ ... }>(...) - com type parameters
 *
 * @param init - Nó AST da expressão
 * @param filePath - Caminho do arquivo (para debug)
 * @param varName - Nome da variável (para debug)
 * @param importMap - Mapa de imports do arquivo
 * @returns Nome do trigger ou null se não for um trigger
 */
export function extractFirebaseTriggerName(
  init: Node,
  filePath?: string,
  varName?: string,
  importMap?: Map<string, { name: string; module: string }>
): string | null {
  const text = init.getText().trim();

  // Debug: mostrar texto sendo analisado
  const shouldDebug = filePath && filePath.includes("functions/src/");

  if (shouldDebug) {
    logger.debugFunctions(`[extractFirebaseTriggerName] Iniciando análise`);
    logger.debugFunctions(`  VarName: ${varName}`);
    logger.debugFunctions(`  Node Kind: ${init.getKindName()} (${init.getKind()})`);
    logger.debugFunctions(`  É CallExpression: ${Node.isCallExpression(init)}`);
    logger.debugFunctions(`  ImportMap disponível: ${importMap ? "SIM" : "NÃO"}`);
  }

  // 1. Tentativa via AST e Imports (Mais preciso)
  if (importMap && Node.isCallExpression(init)) {
    const expr = init.getExpression();

    if (shouldDebug) {
      logger.debugFunctions(`  Expression Kind: ${expr.getKindName()} (${expr.getKind()})`);
      logger.debugFunctions(`  É Identifier: ${Node.isIdentifier(expr)}`);
      logger.debugFunctions(`  É PropertyAccess: ${Node.isPropertyAccessExpression(expr)}`);
    }

    // Caso 1: Chamada direta: onCall(...)
    if (Node.isIdentifier(expr)) {
      const name = expr.getText();
      const importInfo = importMap.get(name);

      if (shouldDebug) {
        logger.debugFunctions(`  [Caso 1: Identifier] Nome: ${name}`);
        logger.debugFunctions(`    ImportInfo: ${importInfo ? JSON.stringify(importInfo) : "não encontrado"}`);
      }

      // Se importado de firebase-functions
      if (importInfo && importInfo.module.includes("firebase-functions")) {
        if (FIREBASE_V2_TRIGGERS.has(importInfo.name as any)) {
          if (shouldDebug) logger.debugFunctions(`    ✓ Import detectado: ${name} -> ${importInfo.name} from ${importInfo.module}`);
          return importInfo.name as string;
        }
      }

      // Se for um trigger conhecido (mesmo sem import detectado, assume global/auto-import)
      if (FIREBASE_V2_TRIGGERS.has(name as any)) {
        if (shouldDebug) logger.debugFunctions(`    ✓ Trigger conhecido detectado: ${name}`);
        return name;
      }
    }

    // Caso 2: Property Access: v2.https.onCall(...) ou functions.https.onCall(...)
    else if (Node.isPropertyAccessExpression(expr)) {
      // Obter o nome final (ex: onCall, onRequest)
      const lastPart = expr.getName();

      if (shouldDebug) {
        logger.debugFunctions(`  [Caso 2: PropertyAccess] Última parte: ${lastPart}`);
      }

      if (FIREBASE_V2_TRIGGERS.has(lastPart as any)) {
        // Verificar se a raiz vem do firebase
        // Ex: v2.https.onCall -> raiz v2
        let root = expr.getExpression();
        let depth = 0;
        while (Node.isPropertyAccessExpression(root) && depth < 10) {
          root = root.getExpression();
          depth++;
        }

        if (Node.isIdentifier(root)) {
          const rootName = root.getText();
          const importInfo = importMap.get(rootName);

          if (shouldDebug) {
            logger.debugFunctions(`    Raiz: ${rootName} (profundidade: ${depth})`);
            logger.debugFunctions(`    ImportInfo da raiz: ${importInfo ? JSON.stringify(importInfo) : "não encontrado"}`);
          }

          if (importInfo && importInfo.module.includes("firebase-functions")) {
            if (shouldDebug) logger.debugFunctions(`    ✓ Chain detectada: ${rootName}...${lastPart} from ${importInfo.module}`);
            return lastPart;
          }

          // Heurística para v2, functions, firebase, admin
          if (["v2", "functions", "firebase", "admin"].includes(rootName)) {
            if (shouldDebug) logger.debugFunctions(`    ✓ Heurística: raiz "${rootName}" é conhecida do Firebase`);
            return lastPart as string;
          }
        }
      }
    }
  }

  if (shouldDebug && varName) {
    logger.debugFunctions(`  [regex] Analisando texto: "${text.slice(0, 60)}..."`);
  }

  // 2. Fallback: Regex para casos onde AST não é suficiente
  for (const trigger of FIREBASE_V2_TRIGGERS) {
    // Pattern melhorado: trigger pode vir após:
    // - ^ (início da string)
    // - \. (ponto, para namespace)
    // - \s (espaço)
    // - \( (parêntese, para casos aninhados)
    // E pode ter type parameters: onCall<Request, Response>(
    // Usar [\s\S] em vez de [^>] para suportar type parameters multiline
    const pattern = new RegExp(`(?:^|\\.|\\s|\\()${trigger}(?:<[\\s\\S]*?>)?\\s*\\(`);

    if (shouldDebug && varName) {
      const testResult = pattern.test(text);
      logger.debugFunctions(`  [regex] Testando ${trigger}: ${testResult ? "✓ MATCH" : "✗ no match"}`);
    }

    if (pattern.test(text)) {
      if (shouldDebug && varName) {
        logger.debugFunctions(`  [regex] ✓✓✓ TRIGGER ENCONTRADO: ${trigger}`);
      }
      return trigger;
    }
  }

  return null;
}

/**
 * Extrai metadados do trigger (path, schedule, etc)
 *
 * @param init - Nó AST da expressão
 * @param triggerName - Nome do trigger detectado
 * @returns Objeto com metadados do trigger
 */
export function extractTriggerInfo(init: { getText(): string }, triggerName: string): TriggerInfo {
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
