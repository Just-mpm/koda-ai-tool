/**
 * Sistema de cache para ai-tool
 *
 * Salva resultados em .analyze/ para evitar reprocessamento
 * quando nenhum arquivo mudou.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  readdirSync,
} from "fs";
import { join, extname } from "path";
import { clearFirebaseCache } from "../utils/firebase.js";

const CACHE_DIR = ".analyze";
const META_FILE = "meta.json";
const GRAPH_FILE = "graph.json";
const MAP_FILE = "map.json";
const DEAD_FILE = "dead.json";

interface CacheMeta {
  version: string;
  createdAt: string;
  lastCheck: string;
  filesHash: string;
}

interface CachedGraph {
  graph: Record<
    string,
    { id: string; adjacentTo: string[]; body: Record<string, unknown> }
  >;
  files: string[];
  timestamp: string;
}

/**
 * Calcula hash baseado nos timestamps dos arquivos do projeto
 */
function calculateFilesHash(cwd: string): string {
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  const timestamps: number[] = [];

  function scanDir(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Ignorar pastas não relevantes
        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".git" ||
            entry.name === ".next" ||
            entry.name === "dist" ||
            entry.name === ".analyze"
          ) {
            continue;
          }
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            try {
              const stat = statSync(fullPath);
              timestamps.push(stat.mtimeMs);
            } catch {
              // Ignorar arquivos inacessíveis
            }
          }
        }
      }
    } catch {
      // Ignorar diretórios inacessíveis
    }
  }

  scanDir(cwd);

  // FIX: Incluir areas.config.json no hash para invalidar cache quando config mudar
  try {
    const configPath = join(cwd, CACHE_DIR, "areas.config.json");
    if (existsSync(configPath)) {
      const stat = statSync(configPath);
      timestamps.push(stat.mtimeMs);
    }
  } catch {
    // Ignorar se não existir
  }

  // Hash simples: soma dos timestamps + contagem
  const sum = timestamps.reduce((a, b) => a + b, 0);
  return `${timestamps.length}-${Math.floor(sum)}`;
}

/**
 * Obtém o caminho da pasta de cache
 */
export function getCacheDir(cwd: string): string {
  return join(cwd, CACHE_DIR);
}

/**
 * Verifica se o cache existe e é válido
 */
export function isCacheValid(cwd: string): boolean {
  const cacheDir = getCacheDir(cwd);
  const metaPath = join(cacheDir, META_FILE);

  if (!existsSync(metaPath)) {
    return false;
  }

  try {
    const meta: CacheMeta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const currentHash = calculateFilesHash(cwd);

    // Cache válido se o hash dos arquivos não mudou
    return meta.filesHash === currentHash;
  } catch {
    return false;
  }
}

/**
 * Lê dados do cache
 */
export function readCache<T>(cwd: string, file: string): T | null {
  const cachePath = join(getCacheDir(cwd), file);

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Escreve dados no cache
 */
export function writeCache(cwd: string, file: string, data: unknown): void {
  const cacheDir = getCacheDir(cwd);

  // Criar diretório se não existir
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const cachePath = join(cacheDir, file);
  writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Atualiza o meta do cache
 */
export function updateCacheMeta(cwd: string): void {
  const meta: CacheMeta = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
    filesHash: calculateFilesHash(cwd),
  };

  writeCache(cwd, META_FILE, meta);
}

/**
 * Salva o grafo de dependências no cache
 */
export function cacheGraph(cwd: string, graph: CachedGraph): void {
  writeCache(cwd, GRAPH_FILE, graph);
  updateCacheMeta(cwd);
}

/**
 * Lê o grafo de dependências do cache
 */
export function getCachedGraph(cwd: string): CachedGraph | null {
  if (!isCacheValid(cwd)) {
    return null;
  }
  return readCache<CachedGraph>(cwd, GRAPH_FILE);
}

/**
 * Salva resultado do map no cache
 */
export function cacheMapResult(cwd: string, result: unknown): void {
  writeCache(cwd, MAP_FILE, result);
}

/**
 * Lê resultado do map do cache
 */
export function getCachedMapResult<T>(cwd: string): T | null {
  if (!isCacheValid(cwd)) {
    return null;
  }
  return readCache<T>(cwd, MAP_FILE);
}

/**
 * Salva resultado do dead no cache
 */
export function cacheDeadResult(cwd: string, result: unknown): void {
  writeCache(cwd, DEAD_FILE, result);
}

/**
 * Lê resultado do dead do cache
 */
export function getCachedDeadResult<T>(cwd: string): T | null {
  if (!isCacheValid(cwd)) {
    return null;
  }
  return readCache<T>(cwd, DEAD_FILE);
}

/**
 * Invalida o cache (força regeneração)
 */
export function invalidateCache(cwd: string): void {
  const metaPath = join(getCacheDir(cwd), META_FILE);

  // Limpar cache do Firebase também
  clearFirebaseCache();

  if (existsSync(metaPath)) {
    try {
      writeFileSync(metaPath, "{}", "utf-8");
    } catch {
      // Ignorar erros
    }
  }
}

export { CACHE_DIR, META_FILE, GRAPH_FILE, MAP_FILE, DEAD_FILE };
export type { CacheMeta, CachedGraph };
