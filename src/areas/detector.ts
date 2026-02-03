/**
 * Detector de áreas
 *
 * Detecta áreas baseado APENAS em configuração manual.
 *
 * A configuração é feita em .analyze/areas.config.json:
 * - areas.<id>.patterns: glob patterns
 * - areas.<id>.keywords: keywords no caminho
 * - areas.<id>.exclude: padrões para excluir
 */

import { minimatch } from "minimatch";
import type { AreaConfig, AreasConfigFile } from "../types.js";

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

/**
 * Detecta a(s) área(s) de um arquivo baseado APENAS na configuração manual
 * Retorna array porque um arquivo pode pertencer a múltiplas áreas
 */
export function detectFileAreas(
  filePath: string,
  config: AreasConfigFile
): string[] {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const matches: string[] = [];

  // Verificar configuração manual de cada área
  for (const [areaId, areaConfig] of Object.entries(config.areas)) {
    if (matchesAreaConfig(normalizedPath, areaConfig)) {
      matches.push(areaId);
    }
  }

  return matches;
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
  // Verificar config
  if (config.areas[areaId]?.name) {
    return config.areas[areaId].name;
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
  return config.areas[areaId]?.description;
}

/**
 * Infere descrição de um arquivo baseado em seu nome e categoria
 */
export function inferFileDescription(
  filePath: string,
  category: string
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
  const categoryDescriptions: Partial<Record<string, string>> = {
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
