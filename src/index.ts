/**
 * ai-tool - Ferramenta de análise de dependências e impacto
 *
 * Usa Skott + Knip internamente para análise precisa.
 *
 * @example
 * ```typescript
 * import { map, dead, impact } from "ai-tool";
 *
 * // Mapa do projeto
 * const projectMap = await map({ format: "json" });
 *
 * // Código morto
 * const deadCode = await dead({ format: "json" });
 *
 * // Análise de impacto
 * const analysis = await impact("src/components/Button.tsx", { format: "json" });
 * ```
 */

// Comandos
export { map } from "./commands/map.js";
export { dead, deadFix } from "./commands/dead.js";
export { impact } from "./commands/impact.js";
export { suggest } from "./commands/suggest.js";
export { context } from "./commands/context.js";

// Tipos
export type {
  OutputFormat,
  FileCategory,
  CommandOptions,
  MapOptions,
  DeadOptions,
  ImpactOptions,
  MapResult,
  DeadResult,
  ImpactResult,
  FileInfo,
  FolderStats,
  DeadFile,
  ImpactFile,
  RiskInfo,
  // Suggest types
  SuggestOptions,
  SuggestionPriority,
  Suggestion,
  SuggestResult,
  // Context types
  ContextOptions,
  ImportInfo,
  ParamInfo,
  FunctionInfo,
  TypeKind,
  TypeInfo,
  ContextResult,
} from "./types.js";

// Utilitários
export { detectCategory, categoryIcons, isEntryPoint, isCodeFile } from "./utils/detect.js";

// Cache
export { invalidateCache, isCacheValid, getCacheDir } from "./cache/index.js";

// Versão
export const VERSION = "0.3.1";
