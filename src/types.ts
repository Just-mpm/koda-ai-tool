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
  | "other";

export interface CommandOptions {
  format?: OutputFormat;
  cwd?: string;
  save?: boolean;
  cache?: boolean; // default: true
}

export interface MapOptions extends CommandOptions {
  trackDependencies?: boolean;
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
  summary: {
    totalFiles: number;
    totalFolders: number;
    categories: Partial<Record<FileCategory, number>>;
  };
  folders: FolderStats[];
  files: FileInfo[];
  circularDependencies: string[][];
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
}
