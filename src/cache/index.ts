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
const SYMBOLS_FILE = "symbols.json";

interface CacheMeta {
  version: string;
  schemaVersion: string;
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
 * Pastas a ignorar no scan de hash (além das padrões)
 */
const HASH_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".analyze",
  ".vercel",
  ".turbo",
  ".cache",
  "coverage",
  "functions/lib",
  "lib",
  ".output",
  "out",
  ".firebase",
]);

/**
 * Calcula hash baseado nos timestamps dos arquivos do projeto
 * Otimizado para projetos grandes - limita profundidade e usa sampling
 */
function calculateFilesHash(cwd: string): string {
  const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  
  // Usar XOR para combinar hashes (mais rápido que soma e menos colisões)
  let hashAccumulator = 0;
  let fileCount = 0;
  let maxTimestamp = 0;
  
  // Limitar profundidade para evitar scan excessivo em node_modules aninhados
  const MAX_DEPTH = 6;

  function scanDir(dir: string, depth: number): void {
    if (depth > MAX_DEPTH) return;
    
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Ignorar arquivos/pastas ocultos
        if (entry.name.startsWith(".")) continue;
        
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Ignorar pastas não relevantes
          if (HASH_IGNORED_DIRS.has(entry.name)) continue;
          
          // Limitar profundidade
          if (depth < MAX_DEPTH) {
            scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.has(ext)) {
            try {
              const stat = statSync(fullPath);
              const mtime = stat.mtimeMs;
              
              // Acumular com XOR (mais eficiente)
              hashAccumulator ^= Math.floor(mtime);
              fileCount++;
              
              // Track do timestamp mais recente (útil para detectar mudanças recentes)
              if (mtime > maxTimestamp) {
                maxTimestamp = mtime;
              }
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

  scanDir(cwd, 0);

  // Incluir areas.config.json no hash
  try {
    const configPath = join(cwd, CACHE_DIR, "areas.config.json");
    if (existsSync(configPath)) {
      const stat = statSync(configPath);
      hashAccumulator ^= Math.floor(stat.mtimeMs);
    }
  } catch {
    // Ignorar se não existir
  }

  // Hash composto: contagem + acumulador XOR + timestamp máximo
  // Isso detecta: adição/remoção de arquivos, modificações, e mudanças recentes
  return `${fileCount}-${hashAccumulator}-${maxTimestamp}`;
}

/**
 * Obtém o caminho da pasta de cache
 */
export function getCacheDir(cwd: string): string {
  return join(cwd, CACHE_DIR);
}

/**
 * Versão mínima do schema de cache requerida.
 * Incrementar quando houver mudanças incompatíveis no formato.
 */
const MIN_SCHEMA_VERSION = "2.0.0";

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

    // Verificar versão do schema (novo em v2.0.0)
    if (!meta.schemaVersion || meta.schemaVersion < MIN_SCHEMA_VERSION) {
      // Cache em formato antigo - precisará regenerar
      return false;
    }

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
    schemaVersion: "2.0.0",
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

/**
 * Salva índice de símbolos no cache
 */
export function cacheSymbolsIndex(cwd: string, index: unknown): void {
  writeCache(cwd, SYMBOLS_FILE, index);
  updateCacheMeta(cwd);
}

/**
 * Lê índice de símbolos do cache
 */
export function getCachedSymbolsIndex<T>(cwd: string): T | null {
  if (!isCacheValid(cwd)) {
    return null;
  }
  return readCache<T>(cwd, SYMBOLS_FILE);
}

export { CACHE_DIR, META_FILE, GRAPH_FILE, MAP_FILE, DEAD_FILE, SYMBOLS_FILE };
export type { CacheMeta, CachedGraph };
