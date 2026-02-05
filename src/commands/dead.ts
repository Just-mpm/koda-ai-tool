/**
 * Comando DEAD - Detecção de código morto usando Knip
 *
 * Inclui filtro inteligente para Firebase Cloud Functions que elimina
 * falsos positivos de arquivos exportados via functions/src/index.ts
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import type { DeadOptions, DeadResult, DeadFile } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatDeadText } from "../formatters/text.js";
import { getIgnorePatterns } from "../areas/config.js";
import {
  isCacheValid,
  getCachedDeadResult,
  cacheDeadResult,
  updateCacheMeta,
} from "../cache/index.js";
import {
  filterCloudFunctionsFalsePositives,
  hasFirebaseFunctions,
} from "../utils/firebase.js";
import { parseCommandOptions, formatOutput } from "./base.js";

interface KnipIssue {
  file: string;
  symbol?: string;
  symbolType?: string;
  parentSymbol?: string;
}

interface KnipOutput {
  files?: string[];
  issues?: KnipIssue[];
  dependencies?: string[];
  devDependencies?: string[];
  unlisted?: Record<string, string[]>;
  binaries?: Record<string, string[]>;
  unresolved?: Record<string, string[]>;
}

/**
 * Gera arquivo knip.json temporário baseado no ignore do areas.config
 */
function generateKnipConfig(cwd: string): string | null {
  const ignorePatterns = getIgnorePatterns(cwd);

  if (ignorePatterns.length === 0) {
    return null; // Nenhum ignore, usar config do Knip
  }

  const knipConfig = {
    $schema: "https://unpkg.com/knip@5/schema.json",
    ignore: ignorePatterns,
  };

  const configPath = join(cwd, ".knip.ai-tool.json");
  writeFileSync(configPath, JSON.stringify(knipConfig, null, 2), "utf-8");

  return configPath;
}

/**
 * Executa o comando DEAD
 */
export async function dead(options: DeadOptions = {}): Promise<string> {
  const { cwd, format } = parseCommandOptions(options);
  const useCache = options.cache !== false; // default: true

  // Tentar usar cache
  if (useCache && isCacheValid(cwd)) {
    const cached = getCachedDeadResult<DeadResult>(cwd);
    if (cached) {
      const result = { ...cached, timestamp: new Date().toISOString(), fromCache: true };

      return formatOutput(result, format, formatDeadText, true);
    }
  }

  try {
    // Executar Knip com output JSON
    let knipOutput: KnipOutput;

    // Gerar config temporária baseada no ignore do areas.config
    const knipConfigPath = generateKnipConfig(cwd);
    const configFlag = knipConfigPath ? `--config=${knipConfigPath}` : "";

    try {
      const output = execSync(`npx knip ${configFlag} --reporter=json`, {
        cwd,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });

      knipOutput = JSON.parse(output || "{}");
    } catch (execError) {
      // Knip retorna exit code 1 quando encontra issues
      // Mas ainda assim produz output JSON válido
      const error = execError as { stdout?: string; stderr?: string };
      if (error.stdout) {
        try {
          knipOutput = JSON.parse(error.stdout);
        } catch {
          knipOutput = {};
        }
      } else {
        knipOutput = {};
      }
    } finally {
      // Limpar config temporária após execução
      if (knipConfigPath && existsSync(knipConfigPath)) {
        try {
          unlinkSync(knipConfigPath);
        } catch {
          // Ignorar erro na remoção
        }
      }
    }

    // Processar arquivos órfãos (com filtro de Cloud Functions)
    const rawFiles = knipOutput.files || [];
    const { filtered: filteredFiles, excluded: excludedFunctions } =
      filterCloudFunctionsFalsePositives(rawFiles, cwd);

    const deadFiles: DeadFile[] = filteredFiles.map((file) => ({
      path: file,
      category: detectCategory(file),
      type: "file" as const,
    }));

    // Log de debug se houve exclusões
    const hasFirebase = hasFirebaseFunctions(cwd);
    const firebaseInfo = hasFirebase
      ? { detected: true, excludedCount: excludedFunctions.length }
      : { detected: false, excludedCount: 0 };

    // Processar exports não usados
    const deadExports: Array<{ file: string; export: string }> = [];
    if (knipOutput.issues) {
      for (const issue of knipOutput.issues) {
        if (issue.symbol && issue.symbolType === "export") {
          deadExports.push({
            file: issue.file,
            export: issue.symbol,
          });
        }
      }
    }

    // Processar dependências não usadas
    const deadDependencies = [
      ...(knipOutput.dependencies || []),
      ...(knipOutput.devDependencies || []),
    ];

    // Montar resultado
    const result: DeadResult = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      cwd,
      summary: {
        totalDead: deadFiles.length + deadExports.length + deadDependencies.length,
        byType: {
          files: deadFiles.length,
          exports: deadExports.length,
          dependencies: deadDependencies.length,
        },
      },
      files: deadFiles,
      exports: deadExports,
      dependencies: deadDependencies,
      // Metadata sobre filtros aplicados
      filters: {
        firebase: firebaseInfo,
        excludedFiles: excludedFunctions,
      },
    };

    // Salvar no cache
    if (useCache) {
      cacheDeadResult(cwd, result);
      updateCacheMeta(cwd);
    }

    // Formatar output
    return formatOutput(result, format, formatDeadText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar dead: ${message}`);
  }
}

/**
 * Executa fix automático do Knip
 */
export async function deadFix(options: DeadOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();

  try {
    const output = execSync("npx knip --fix", {
      cwd,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });

    return `✅ Fix executado com sucesso!\n\n${output}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar fix: ${message}`);
  }
}
