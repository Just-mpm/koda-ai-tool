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
export { areas } from "./commands/areas.js";
export { area } from "./commands/area.js";
export { areasInit } from "./commands/areas-init.js";

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
  // Areas types
  AreaConfig,
  AreasConfigFile,
  AreaFile,
  DetectedArea,
  AreasResult,
  AreaDetailResult,
  AreasOptions,
  AreaOptions,
} from "./types.js";

// Utilitários
export { detectCategory, categoryIcons, isEntryPoint, isCodeFile } from "./utils/detect.js";

// Similaridade e erros
export { levenshteinDistance, findSimilar, findBestMatch, extractFileName } from "./utils/similarity.js";
export {
  formatFileNotFound,
  formatAreaNotFound,
  formatMissingTarget,
  formatInvalidCommand,
  COMMAND_REFERENCE,
} from "./utils/errors.js";
export type { FindSimilarOptions } from "./utils/similarity.js";
export type { FormatFileNotFoundOptions, FormatAreaNotFoundOptions, AreaInfo } from "./utils/errors.js";

// Firebase Cloud Functions utils
export {
  isFirebaseProject,
  hasFirebaseFunctions,
  isExportedCloudFunction,
  filterCloudFunctionsFalsePositives,
  clearFirebaseCache,
} from "./utils/firebase.js";

// Cache
export { invalidateCache, isCacheValid, getCacheDir } from "./cache/index.js";

// Areas
export {
  readConfig,
  writeConfig,
  configExists,
  setArea,
  removeArea,
  setFileDescription,
  getFileDescription,
} from "./areas/config.js";
export {
  detectFileAreas,
  getAreaName,
  getAreaDescription,
  inferFileDescription,
} from "./areas/detector.js";
export { FOLDER_PATTERNS, KEYWORD_PATTERNS, AREA_NAMES, AREA_DESCRIPTIONS } from "./areas/patterns.js";

// Versão - lida do package.json em runtime
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");
export const VERSION: string = pkg.version;
