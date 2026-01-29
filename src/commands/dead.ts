/**
 * Comando DEAD - Detecção de código morto usando Knip
 */

import { execSync } from "child_process";
import type { DeadOptions, DeadResult, DeadFile } from "../types.js";
import { detectCategory } from "../utils/detect.js";
import { formatDeadText } from "../formatters/text.js";
import {
  isCacheValid,
  getCachedDeadResult,
  cacheDeadResult,
  updateCacheMeta,
} from "../cache/index.js";

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
 * Executa o comando DEAD
 */
export async function dead(options: DeadOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const format = options.format || "text";
  const useCache = options.cache !== false; // default: true

  // Tentar usar cache
  if (useCache && isCacheValid(cwd)) {
    const cached = getCachedDeadResult<DeadResult>(cwd);
    if (cached) {
      const result = { ...cached, timestamp: new Date().toISOString(), fromCache: true };

      if (format === "json") {
        return JSON.stringify(result, null, 2);
      }
      return formatDeadText(result) + "\n\n📦 (resultado do cache)";
    }
  }

  try {
    // Executar Knip com output JSON
    let knipOutput: KnipOutput;

    try {
      const output = execSync("npx knip --reporter=json", {
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
    }

    // Processar arquivos órfãos
    const deadFiles: DeadFile[] = (knipOutput.files || []).map((file) => ({
      path: file,
      category: detectCategory(file),
      type: "file" as const,
    }));

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
    };

    // Salvar no cache
    if (useCache) {
      cacheDeadResult(cwd, result);
      updateCacheMeta(cwd);
    }

    // Formatar output
    if (format === "json") {
      return JSON.stringify(result, null, 2);
    }

    return formatDeadText(result);
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
