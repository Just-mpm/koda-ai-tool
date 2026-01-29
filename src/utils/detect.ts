/**
 * Utilitários para detecção e classificação de arquivos
 */

import type { FileCategory } from "../types.js";

/**
 * Detecta a categoria de um arquivo baseado no path
 */
export function detectCategory(filePath: string): FileCategory {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const fileName = normalized.split("/").pop() || "";
  const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

  // Tests
  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/test/")
  ) {
    return "test";
  }

  // Config files
  if (isConfigFile(fileName)) {
    return "config";
  }

  // Next.js App Router
  if (fileNameNoExt === "page") return "page";
  if (fileNameNoExt === "layout") return "layout";
  if (fileNameNoExt === "route") return "route";
  if (
    ["error", "global-error", "not-found", "loading", "template", "middleware", "default"].includes(
      fileNameNoExt
    )
  ) {
    return "page";
  }

  // Por pasta/nome
  if (normalized.includes("/api/")) return "route";
  if (normalized.includes("/pages/")) return "page";

  // Hooks
  if (fileNameNoExt.startsWith("use") && fileNameNoExt.length > 3) return "hook";
  if (normalized.includes("/hooks/")) return "hook";

  // Types
  if (
    normalized.includes("/types/") ||
    fileName.endsWith(".d.ts") ||
    fileNameNoExt === "types" ||
    fileNameNoExt === "interfaces"
  ) {
    return "type";
  }

  // Services
  if (normalized.includes("/services/") || fileNameNoExt.endsWith("service")) {
    return "service";
  }

  // Store/Context
  if (
    normalized.includes("/store/") ||
    normalized.includes("/stores/") ||
    normalized.includes("/context/") ||
    normalized.includes("/contexts/") ||
    normalized.includes("/providers/")
  ) {
    return "store";
  }

  // Utils
  if (
    normalized.includes("/utils/") ||
    normalized.includes("/lib/") ||
    normalized.includes("/helpers/") ||
    normalized.includes("/common/")
  ) {
    return "util";
  }

  // Components
  if (
    normalized.includes("/components/") ||
    normalized.includes("/ui/") ||
    normalized.includes("/features/")
  ) {
    return "component";
  }

  return "other";
}

/**
 * Verifica se é um arquivo de configuração
 */
function isConfigFile(fileName: string): boolean {
  const patterns = [
    /eslint\.config\./,
    /prettier\.config\./,
    /tailwind\.config\./,
    /next\.config\./,
    /vite\.config\./,
    /tsconfig/,
    /jest\.config/,
    /vitest\.config/,
    /postcss\.config/,
    /babel\.config/,
    /webpack\.config/,
    /firebase-messaging-sw/,
    /sw\./,
    /service-worker/,
    /knip\.config/,
    /\.env/,
  ];
  return patterns.some((p) => p.test(fileName));
}

/**
 * Ícones para cada categoria (para output text)
 */
export const categoryIcons: Record<FileCategory, string> = {
  page: "📄",
  layout: "🔲",
  route: "🛣️",
  component: "🧩",
  hook: "🪝",
  store: "🗄️",
  service: "⚙️",
  util: "🔧",
  type: "📝",
  config: "⚙️",
  test: "🧪",
  other: "📁",
};

/**
 * Verifica se um arquivo é entry point
 */
export function isEntryPoint(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const fileName = normalized.split("/").pop() || "";

  const entryPoints = [
    "main.tsx",
    "main.ts",
    "main.jsx",
    "main.js",
    "index.tsx",
    "index.ts",
    "app.tsx",
    "app.ts",
  ];

  if (entryPoints.includes(fileName)) {
    const depth = normalized.split("/").length;
    if (depth <= 2) return true;
  }

  return false;
}

/**
 * Extensões de código suportadas
 */
export const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

/**
 * Verifica se é um arquivo de código
 */
export function isCodeFile(filePath: string): boolean {
  return CODE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}
