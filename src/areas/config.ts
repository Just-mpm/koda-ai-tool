/**
 * Gerenciamento de configuração de áreas
 *
 * Lê e escreve o arquivo areas.config.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { AreasConfigFile, AreaConfig } from "../types.js";
import { CACHE_DIR } from "../cache/index.js";

const CONFIG_FILE = "areas.config.json";
const CACHE_FILE = "areas.json";

/**
 * Configuração padrão com autoDetect desabilitado
 */
export const DEFAULT_CONFIG: AreasConfigFile = {
  $schema: "./areas.schema.json",
  version: "1.0.0",
  ignore: [],
  areas: {},
  descriptions: {},
  settings: {
    autoDetect: false,
    inferDescriptions: true,
    groupByCategory: true,
  },
};

/**
 * Obtém o caminho do arquivo de configuração
 */
export function getConfigPath(cwd: string): string {
  return join(cwd, CACHE_DIR, CONFIG_FILE);
}

/**
 * Obtém o caminho do cache de áreas
 */
export function getAreasCachePath(cwd: string): string {
  return join(cwd, CACHE_DIR, CACHE_FILE);
}

/**
 * Verifica se o arquivo de configuração existe
 */
export function configExists(cwd: string): boolean {
  return existsSync(getConfigPath(cwd));
}

/**
 * Lê o arquivo de configuração
 */
export function readConfig(cwd: string): AreasConfigFile {
  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as AreasConfigFile;

    // Merge com defaults para garantir que todas as propriedades existam
    return {
      ...DEFAULT_CONFIG,
      ...config,
      settings: {
        ...DEFAULT_CONFIG.settings,
        ...config.settings,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Escreve o arquivo de configuração
 */
export function writeConfig(cwd: string, config: AreasConfigFile): void {
  const cacheDir = join(cwd, CACHE_DIR);

  // Criar diretório se não existir
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  const configPath = getConfigPath(cwd);
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Adiciona ou atualiza uma área na configuração
 */
export function setArea(cwd: string, id: string, area: AreaConfig): void {
  const config = readConfig(cwd);
  config.areas[id] = area;
  writeConfig(cwd, config);
}

/**
 * Remove uma área da configuração
 */
export function removeArea(cwd: string, id: string): void {
  const config = readConfig(cwd);
  delete config.areas[id];
  writeConfig(cwd, config);
}

/**
 * Define descrição manual para um arquivo
 */
export function setFileDescription(cwd: string, filePath: string, description: string): void {
  const config = readConfig(cwd);
  if (!config.descriptions) {
    config.descriptions = {};
  }
  config.descriptions[filePath] = description;
  writeConfig(cwd, config);
}

/**
 * Obtém descrição manual de um arquivo (se existir)
 */
export function getFileDescription(cwd: string, filePath: string): string | undefined {
  const config = readConfig(cwd);
  return config.descriptions?.[filePath];
}

/**
 * Obtém a lista de padrões ignore da configuração
 */
export function getIgnorePatterns(cwd: string): string[] {
  const config = readConfig(cwd);
  return config.ignore || [];
}
