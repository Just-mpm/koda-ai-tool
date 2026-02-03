/**
 * Detector de áreas
 *
 * Detecta automaticamente a área de cada arquivo baseado em:
 * 1. Configuração manual (areas.config.json)
 * 2. Padrões de pasta (se autoDetect estiver habilitado)
 * 3. Keywords no nome (se autoDetect estiver habilitado)
 */

import { minimatch } from "minimatch";
import type { AreaConfig, AreasConfigFile, FileCategory } from "../types.js";
import { FOLDER_PATTERNS, KEYWORD_PATTERNS, AREA_NAMES, AREA_DESCRIPTIONS } from "./patterns.js";

/**
 * Verifica se um arquivo deve ser ignorado baseado nos padrões de ignore
 */
export function isFileIgnored(filePath: string, config: AreasConfigFile): boolean {
  const ignorePatterns = config.ignore || [];
  if (ignorePatterns.length === 0) return false;

  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const pattern of ignorePatterns) {
    if (minimatch(normalizedPath, pattern, { dot: true })) {
      return true;
    }
  }

  return false;
}

interface AreaMatch {
  area: string;
  priority: number;
  source: "config" | "folder" | "keyword";
}

/**
 * Detecta a(s) área(s) de um arquivo
 * Retorna array porque um arquivo pode pertencer a múltiplas áreas
 *
 * Respeita settings.autoDetect:
 * - true (default): usa config + padrões automáticos
 * - false: usa APENAS a configuração manual
 */
export function detectFileAreas(
  filePath: string,
  config: AreasConfigFile
): string[] {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const matches: AreaMatch[] = [];

  // Verificar se autoDetect está habilitado (default: true)
  const autoDetect = config.settings?.autoDetect !== false;

  // DEBUG: Log para verificar o valor
  if (filePath.includes("useAuth.ts")) {
    console.error(`[DEBUG] autoDetect for ${filePath}:`, autoDetect);
    console.error(`[DEBUG] config.settings:`, JSON.stringify(config.settings));
  }

  // 1. Verificar configuração manual (maior prioridade - SEMPRE executado)
  for (const [areaId, areaConfig] of Object.entries(config.areas)) {
    if (matchesAreaConfig(normalizedPath, areaConfig)) {
      matches.push({ area: areaId, priority: 200, source: "config" });
    }
  }

  // Se autoDetect está desabilitado, retornar apenas matches da config
  if (!autoDetect) {
    const unique = [...new Set(matches.map((m) => m.area))];
    return unique;
  }

  // 2. Verificar padrões de pasta (apenas se autoDetect = true)
  for (const { pattern, area, priority } of FOLDER_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      // Não adicionar se já existe da config
      if (!matches.some((m) => m.area === area && m.source === "config")) {
        matches.push({ area, priority, source: "folder" });
      }
    }
  }

  // 3. Verificar keywords no nome do arquivo (apenas se autoDetect = true)
  const fileName = normalizedPath.split("/").pop() || "";
  for (const { keyword, area, priority } of KEYWORD_PATTERNS) {
    if (keyword.test(fileName) || keyword.test(normalizedPath)) {
      // Não adicionar se já existe
      if (!matches.some((m) => m.area === area)) {
        matches.push({ area, priority, source: "keyword" });
      }
    }
  }

  // Ordenar por prioridade e retornar únicas
  const sorted = matches.sort((a, b) => b.priority - a.priority);
  const unique = [...new Set(sorted.map((m) => m.area))];

  return unique;
}

/**
 * Verifica se um arquivo corresponde a uma configuração de área
 */
function matchesAreaConfig(filePath: string, config: AreaConfig): boolean {
  // Verificar exclusões primeiro
  if (config.exclude) {
    for (const pattern of config.exclude) {
      if (minimatch(filePath, pattern, { dot: true })) {
        return false;
      }
    }
  }

  // Verificar padrões de inclusão
  for (const pattern of config.patterns) {
    if (minimatch(filePath, pattern, { dot: true })) {
      return true;
    }
  }

  // Verificar keywords
  if (config.keywords) {
    const lowerPath = filePath.toLowerCase();
    for (const keyword of config.keywords) {
      if (lowerPath.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Obtém o nome amigável de uma área
 */
export function getAreaName(areaId: string, config: AreasConfigFile): string {
  // Primeiro verificar config
  if (config.areas[areaId]?.name) {
    return config.areas[areaId].name;
  }

  // Depois padrões
  if (AREA_NAMES[areaId]) {
    return AREA_NAMES[areaId];
  }

  // Fallback: capitalizar o id
  return areaId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Obtém a descrição de uma área
 */
export function getAreaDescription(areaId: string, config: AreasConfigFile): string | undefined {
  // Primeiro verificar config
  if (config.areas[areaId]?.description) {
    return config.areas[areaId].description;
  }

  // Depois padrões
  return AREA_DESCRIPTIONS[areaId];
}

/**
 * Infere descrição de um arquivo baseado em seu nome e categoria
 */
export function inferFileDescription(
  filePath: string,
  category: FileCategory
): string | undefined {
  const fileName = filePath.split("/").pop() || "";
  const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

  // Padrões comuns
  const patterns: Array<{ pattern: RegExp; description: (match: RegExpMatchArray) => string }> = [
    // Pages
    { pattern: /^page$/, description: () => "Página principal" },
    { pattern: /^layout$/, description: () => "Layout" },
    { pattern: /^loading$/, description: () => "Estado de loading" },
    { pattern: /^error$/, description: () => "Página de erro" },
    { pattern: /^not-found$/, description: () => "Página 404" },

    // Components com sufixo
    { pattern: /(.+)PageClient$/, description: (m) => `Client component da página ${m[1]}` },
    { pattern: /(.+)Dialog$/, description: (m) => `Dialog de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Modal$/, description: (m) => `Modal de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Form$/, description: (m) => `Formulário de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Card$/, description: (m) => `Card de ${m[1].toLowerCase()}` },
    { pattern: /(.+)List$/, description: (m) => `Lista de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Table$/, description: (m) => `Tabela de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Manager$/, description: (m) => `Gerenciador de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Provider$/, description: (m) => `Provider de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Context$/, description: (m) => `Context de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Step$/, description: (m) => `Step: ${m[1]}` },
    { pattern: /(.+)Tab$/, description: (m) => `Aba: ${m[1]}` },
    { pattern: /(.+)Section$/, description: (m) => `Seção: ${m[1]}` },
    { pattern: /(.+)Header$/, description: (m) => `Header de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Footer$/, description: (m) => `Footer de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Skeleton$/, description: (m) => `Skeleton de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Chip$/, description: (m) => `Chip de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Badge$/, description: (m) => `Badge de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Button$/, description: (m) => `Botão ${m[1].toLowerCase()}` },
    { pattern: /(.+)Icon$/, description: (m) => `Ícone ${m[1].toLowerCase()}` },

    // Hooks
    { pattern: /^use(.+)$/, description: (m) => `Hook de ${m[1].toLowerCase()}` },

    // Types/Schemas
    { pattern: /(.+)\.types$/, description: (m) => `Tipos de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Schemas?$/, description: (m) => `Schema de ${m[1].toLowerCase()}` },

    // Utils
    { pattern: /(.+)Helpers?$/, description: (m) => `Helpers de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Utils?$/, description: (m) => `Utilitários de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Formatters?$/, description: (m) => `Formatador de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Validators?$/, description: (m) => `Validador de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Mappers?$/, description: (m) => `Mapper de ${m[1].toLowerCase()}` },
    { pattern: /(.+)Converters?$/, description: (m) => `Conversor de ${m[1].toLowerCase()}` },

    // Services
    { pattern: /(.+)Service$/, description: (m) => `Serviço de ${m[1].toLowerCase()}` },

    // Index
    { pattern: /^index$/, description: () => "Export principal" },
  ];

  for (const { pattern, description } of patterns) {
    const match = fileNameNoExt.match(pattern);
    if (match) {
      return description(match);
    }
  }

  // Fallback baseado na categoria
  const categoryDescriptions: Partial<Record<FileCategory, string>> = {
    page: "Página",
    layout: "Layout",
    route: "API Route",
    component: "Componente",
    hook: "Hook",
    service: "Serviço",
    store: "Store",
    util: "Utilitário",
    type: "Tipos",
    config: "Configuração",
    test: "Teste",
  };

  return categoryDescriptions[category];
}
