/**
 * Tipos para o ai-tool
 */

export type OutputFormat = "text" | "json";

export type FileCategory =
  | "page"
  | "layout"
  | "route"
  | "component"
  | "hook"
  | "service"
  | "store"
  | "util"
  | "type"
  | "config"
  | "test"
  | "cloud-function"
  | "other";

export interface CommandOptions {
  format?: OutputFormat;
  cwd?: string;
  save?: boolean;
  cache?: boolean; // default: true
  ctx?: "cli" | "mcp";
}

export interface MapOptions extends CommandOptions {
  trackDependencies?: boolean;
  full?: boolean; // default: false - mostrar resumo compacto
}

export interface DeadOptions extends CommandOptions {
  include?: string[];
  exclude?: string[];
  fix?: boolean;
}

export interface ImpactOptions extends CommandOptions {
  depth?: number;
}

// ============================================================================
// MAP COMMAND TYPES
// ============================================================================

export interface FileInfo {
  path: string;
  category: FileCategory;
  size: number;
}

export interface FolderStats {
  path: string;
  fileCount: number;
  categories: Partial<Record<FileCategory, number>>;
}

export interface MapResult {
  version: string;
  timestamp: string;
  cwd: string;
  framework?: string;
  summary: {
    totalFiles: number;
    totalFolders: number;
    categories: Partial<Record<FileCategory, number>>;
  };
  folders: FolderStats[];
  files: FileInfo[];
  circularDependencies: string[][];
}

/** Dados mínimos de áreas para o resumo do map */
export interface MapAreasInfo {
  names: string[];
  total: number;
  unmappedCount: number;
}

// ============================================================================
// DEAD CODE TYPES
// ============================================================================

export interface DeadFile {
  path: string;
  category: FileCategory;
  type: "file" | "export" | "dependency";
}

export interface DeadResult {
  version: string;
  timestamp: string;
  cwd: string;
  summary: {
    totalDead: number;
    byType: {
      files: number;
      exports: number;
      dependencies: number;
    };
  };
  files: DeadFile[];
  exports: Array<{ file: string; export: string }>;
  dependencies: string[];
  /** Informações sobre filtros aplicados (ex: Cloud Functions excluídas) */
  filters?: {
    firebase: {
      detected: boolean;
      excludedCount: number;
    };
    excludedFiles: string[];
  };
}

// ============================================================================
// IMPACT ANALYSIS TYPES
// ============================================================================

export interface ImpactFile {
  path: string;
  category: FileCategory;
  isDirect: boolean;
}

export interface RiskInfo {
  type: "widely-used" | "circular" | "deep-chain";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface ImpactResult {
  version: string;
  timestamp: string;
  target: string;
  category: FileCategory;
  upstream: {
    direct: ImpactFile[];
    indirect: ImpactFile[];
    total: number;
  };
  downstream: {
    direct: ImpactFile[];
    indirect: ImpactFile[];
    total: number;
  };
  risks: RiskInfo[];
  suggestions: string[];
  gitHistory?: {
    hasGitRepo: boolean;
    recentCommits: Array<{
      hash: string;
      shortHash: string;
      message: string;
      date: string;
      author: string;
    }>;
  };
}

// ============================================================================
// SUGGEST COMMAND TYPES
// ============================================================================

export interface SuggestOptions extends CommandOptions {
  limit?: number;
}

export type SuggestionPriority = "critical" | "high" | "medium" | "low";

export interface Suggestion {
  path: string;
  category: FileCategory;
  reason: string;
  priority: SuggestionPriority;
}

export interface SuggestResult {
  version: string;
  timestamp: string;
  target: string;
  category: FileCategory;
  suggestions: Suggestion[];
  testSuggestions: string[];
}

// ============================================================================
// CONTEXT COMMAND TYPES
// ============================================================================

export interface ContextOptions extends CommandOptions {
  depth?: number;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
}

export type ParamInfo = {
  name: string;
  type: string;
};

export interface FunctionInfo {
  name: string;
  params: ParamInfo[];
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  isArrowFunction: boolean;
  jsdoc?: string;
}

export type TypeKind = "interface" | "type" | "enum";

export interface TypeInfo {
  name: string;
  kind: TypeKind;
  definition: string;
  isExported: boolean;
}

export interface ConstantInfo {
  name: string;
  type: string;
  isExported: boolean;
}

export interface ContextResult {
  version: string;
  timestamp: string;
  file: string;
  category: FileCategory;
  imports: ImportInfo[];
  exports: string[];
  functions: FunctionInfo[];
  types: TypeInfo[];
  constants?: ConstantInfo[];
}

// ============================================================================
// AREAS COMMAND TYPES
// ============================================================================

export interface AreaConfig {
  name: string;
  description?: string;
  patterns: string[];
  keywords?: string[];
  exclude?: string[];
}

export interface AreasConfigFile {
  $schema?: string;
  version: string;
  ignore?: string[]; // Padrões glob para ignorar arquivos/pastas globalmente
  areas: Record<string, AreaConfig>;
  descriptions?: Record<string, string>; // path → descrição manual
  settings?: {
    autoDetect?: boolean; // default: true
    inferDescriptions?: boolean; // default: true
    groupByCategory?: boolean; // default: true
  };
}

export interface AreaFile {
  path: string;
  category: FileCategory;
  description?: string;
}

export interface DetectedArea {
  id: string;
  name: string;
  description?: string;
  files: AreaFile[];
  fileCount: number;
  categories: Partial<Record<FileCategory, number>>;
  isAutoDetected: boolean;
}

export interface AreasResult {
  version: string;
  timestamp: string;
  cwd: string;
  areas: DetectedArea[];
  unmapped: AreaFile[];
  summary: {
    totalAreas: number;
    totalFiles: number;
    unmappedCount: number;
  };
}

export interface AreaDetailResult {
  version: string;
  timestamp: string;
  area: DetectedArea;
  byCategory: Partial<Record<FileCategory, AreaFile[]>>;
}

export interface AreasOptions extends CommandOptions {
  full?: boolean; // mostrar todos os arquivos
  type?: FileCategory; // filtrar por categoria
}

export interface AreaOptions extends CommandOptions {
  full?: boolean;
  type?: FileCategory;
}

// ============================================================================
// AREA CONTEXT TYPES
// ============================================================================

export interface AreaContextTypeInfo {
  name: string;
  file: string;
  line: number;
  definition: string;
}

export interface AreaContextFunctionInfo {
  name: string;
  file: string;
  line: number;
  params: string[];
  returns: string;
}

export interface AreaContextComponentInfo {
  name: string;
  file: string;
  line: number;
  props?: string;
}

export interface AreaContextStoreInfo {
  name: string;
  file: string;
  line: number;
  state: string;
}

export interface AreaContextTriggerInfo {
  name: string;
  file: string;
  line: number;
  triggerType: string;
  triggerPath?: string;
  triggerSchedule?: string;
}

export interface AreaContextResult {
  version: string;
  timestamp: string;
  area: {
    id: string;
    name: string;
    description?: string;
    fileCount: number;
  };
  types: AreaContextTypeInfo[];
  hooks: AreaContextFunctionInfo[];
  functions: AreaContextFunctionInfo[];
  components: AreaContextComponentInfo[];
  services: AreaContextFunctionInfo[];
  stores: AreaContextStoreInfo[];
  triggers: AreaContextTriggerInfo[];
}
