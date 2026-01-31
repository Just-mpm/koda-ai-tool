/**
 * Utilitários para detecção e classificação de arquivos
 */

import type { FileCategory } from "../types.js";

/**
 * Detecta a categoria de um arquivo baseado no path
 *
 * Suporta múltiplos frameworks:
 * - Next.js (App Router e Pages Router)
 * - Vite (React, Vue, Svelte)
 * - Create React App
 * - Remix
 * - Nuxt
 * - SvelteKit
 * - Astro
 */
export function detectCategory(filePath: string): FileCategory {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const fileName = normalized.split("/").pop() || "";
  const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs|vue|svelte|astro)$/, "");

  // Tests (todos os frameworks)
  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/test/") ||
    normalized.includes("/tests/")
  ) {
    return "test";
  }

  // Config files (todos os frameworks)
  if (isConfigFile(fileName)) {
    return "config";
  }

  // ============================================================================
  // NEXT.JS
  // ============================================================================

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

  // Next.js Pages Router
  if (normalized.includes("/pages/") && !normalized.includes("/pages/api/")) {
    return "page";
  }

  // ============================================================================
  // VITE / CRA / GENERIC REACT
  // ============================================================================

  // Vite/CRA: src/pages/ ou src/views/
  if (
    normalized.includes("/pages/") ||
    normalized.includes("/views/") ||
    normalized.includes("/screens/")
  ) {
    // Mas não se for componente dentro de pages (ex: pages/Dashboard/components/)
    if (!normalized.includes("/components/")) {
      return "page";
    }
  }

  // Vite/CRA: arquivos com sufixo Page ou View
  if (
    fileNameNoExt.endsWith("page") ||
    fileNameNoExt.endsWith("view") ||
    fileNameNoExt.endsWith("screen")
  ) {
    return "page";
  }

  // ============================================================================
  // REMIX
  // ============================================================================

  // Remix: app/routes/
  if (normalized.includes("/routes/") && normalized.includes("/app/")) {
    return "page";
  }

  // ============================================================================
  // NUXT (Vue)
  // ============================================================================

  // Nuxt: pages/, layouts/
  if (normalized.includes("/layouts/")) {
    return "layout";
  }

  // ============================================================================
  // SVELTEKIT
  // ============================================================================

  // SvelteKit: src/routes/+page.svelte, +layout.svelte
  if (fileNameNoExt === "+page" || fileNameNoExt === "+page.server") return "page";
  if (fileNameNoExt === "+layout" || fileNameNoExt === "+layout.server") return "layout";
  if (fileNameNoExt === "+server") return "route";
  if (fileNameNoExt === "+error") return "page";

  // ============================================================================
  // ASTRO
  // ============================================================================

  // Astro: src/pages/*.astro
  if (fileName.endsWith(".astro") && normalized.includes("/pages/")) {
    return "page";
  }
  if (fileName.endsWith(".astro") && normalized.includes("/layouts/")) {
    return "layout";
  }

  // ============================================================================
  // API ROUTES (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/api/") ||
    normalized.includes("/server/") ||
    fileNameNoExt.endsWith(".server") ||
    fileNameNoExt === "+server"
  ) {
    return "route";
  }

  // ============================================================================
  // HOOKS (React, Vue composables, Svelte)
  // ============================================================================

  // React hooks
  if (fileNameNoExt.startsWith("use") && fileNameNoExt.length > 3) return "hook";
  if (normalized.includes("/hooks/")) return "hook";

  // Vue composables
  if (normalized.includes("/composables/")) return "hook";

  // Svelte stores (similar a hooks)
  if (normalized.includes("/stores/") && fileName.endsWith(".ts")) return "hook";

  // ============================================================================
  // TYPES (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/types/") ||
    normalized.includes("/interfaces/") ||
    fileName.endsWith(".d.ts") ||
    fileNameNoExt === "types" ||
    fileNameNoExt === "interfaces"
  ) {
    return "type";
  }

  // ============================================================================
  // SERVICES (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/services/") ||
    normalized.includes("/api-client/") ||
    fileNameNoExt.endsWith("service") ||
    fileNameNoExt.endsWith("api")
  ) {
    return "service";
  }

  // ============================================================================
  // STORE/STATE (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/store/") ||
    normalized.includes("/stores/") ||
    normalized.includes("/context/") ||
    normalized.includes("/contexts/") ||
    normalized.includes("/providers/") ||
    normalized.includes("/state/") ||
    // Zustand, Redux, Pinia, etc
    fileNameNoExt.endsWith("store") ||
    fileNameNoExt.endsWith("slice") ||
    fileNameNoExt.endsWith("reducer")
  ) {
    return "store";
  }

  // ============================================================================
  // UTILS (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/utils/") ||
    normalized.includes("/lib/") ||
    normalized.includes("/helpers/") ||
    normalized.includes("/common/") ||
    normalized.includes("/shared/") ||
    fileNameNoExt.endsWith("utils") ||
    fileNameNoExt.endsWith("helpers")
  ) {
    return "util";
  }

  // ============================================================================
  // COMPONENTS (todos os frameworks)
  // ============================================================================

  if (
    normalized.includes("/components/") ||
    normalized.includes("/ui/") ||
    normalized.includes("/features/") ||
    normalized.includes("/modules/") ||
    // Vue/Svelte single file components
    fileName.endsWith(".vue") ||
    fileName.endsWith(".svelte")
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
