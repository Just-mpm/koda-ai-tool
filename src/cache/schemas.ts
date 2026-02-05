/**
 * Schemas Zod para validação de cache
 *
 * Valida os dados dos arquivos de cache (map, dead, symbols)
 * para garantir integridade e detectar formatos obsoletos.
 *
 * @see https://zod.dev
 */

import { z } from "zod";

// ============================================================================
// MAP RESULT SCHEMA
// ============================================================================

/**
 * Schema para resultado do comando map
 */
export const mapResultSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  cwd: z.string(),
  summary: z.object({
    totalFiles: z.number(),
    totalFolders: z.number(),
    categories: z.record(z.string(), z.number()).optional(),
  }),
  folders: z.array(
    z.object({
      path: z.string(),
      depth: z.number(),
      fileCount: z.number(),
    })
  ),
  files: z.array(
    z.object({
      path: z.string(),
      category: z.string(),
      size: z.number(),
    })
  ),
  circularDependencies: z.array(z.string()),
});

// ============================================================================
// DEAD RESULT SCHEMA
// ============================================================================

/**
 * Schema para resultado do comando dead
 */
export const deadResultSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  cwd: z.string(),
  summary: z.object({
    totalDead: z.number(),
    byType: z.object({
      files: z.number(),
      exports: z.number(),
      dependencies: z.number(),
    }),
  }),
  files: z.array(
    z.object({
      path: z.string(),
      category: z.string(),
      type: z.enum(["file", "export", "dependency"]),
    })
  ),
  exports: z.array(
    z.object({
      file: z.string(),
      export: z.string(),
    })
  ),
  dependencies: z.array(z.string()),
});

// ============================================================================
// PROJECT INDEX SCHEMA
// ============================================================================

/**
 * Schema para índice de símbolos do projeto
 */
export const projectIndexSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  files: z.record(
    z.object({
      path: z.string(),
      category: z.string(),
      symbols: z.array(z.any()), // SymbolInfo simplificado
      imports: z.array(
        z.object({
          source: z.string(),
          specifiers: z.array(z.string()),
          isTypeOnly: z.boolean(),
        })
      ),
      exports: z.array(z.string()),
    })
  ),
  symbolsByName: z.record(z.array(z.any())), // SymbolInfo[] simplificado
  fileCount: z.number(),
  symbolCount: z.number(),
});

// ============================================================================
// TYPES (para export)
// ============================================================================

/**
 * Tipo inferido do schema de MapResult
 */
export type MapResult = z.infer<typeof mapResultSchema>;

/**
 * Tipo inferido do schema de DeadResult
 */
export type DeadResult = z.infer<typeof deadResultSchema>;

/**
 * Tipo inferido do schema de ProjectIndex
 */
export type ProjectIndex = z.infer<typeof projectIndexSchema>;
