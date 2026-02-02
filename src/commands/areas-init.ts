/**
 * Comando AREAS INIT - Gera configuração inicial de áreas
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import type { AreasConfigFile, AreaConfig } from "../types.js";
import { readConfig, writeConfig, configExists } from "../areas/config.js";
import { detectFileAreas, getAreaName, getAreaDescription } from "../areas/detector.js";

/**
 * Extensões de código suportadas
 */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * Pastas a ignorar
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".cache",
  "coverage",
  ".turbo",
  ".vercel",
  ".analyze",
]);

interface InitOptions {
  cwd?: string;
  force?: boolean;
}

/**
 * Executa o comando AREAS INIT
 */
export async function areasInit(options: InitOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const force = options.force ?? false;

  try {
    // 1. Verificar se já existe configuração
    if (configExists(cwd) && !force) {
      return `
⚠️ Arquivo de configuração já existe: .analyze/areas.config.json

Use --force para sobrescrever:
  ai-tool areas init --force

Ou edite manualmente o arquivo existente.
`.trim();
    }

    // 2. Listar todos os arquivos
    const allFiles = getAllCodeFiles(cwd);

    // 3. Detectar áreas e contar arquivos
    const currentConfig = readConfig(cwd);
    const areaCounts = new Map<string, Set<string>>();

    for (const filePath of allFiles) {
      const areas = detectFileAreas(filePath, currentConfig);
      for (const areaId of areas) {
        if (!areaCounts.has(areaId)) {
          areaCounts.set(areaId, new Set());
        }
        areaCounts.get(areaId)!.add(filePath);
      }
    }

    // 4. Gerar padrões para cada área detectada
    const generatedAreas: Record<string, AreaConfig> = {};

    for (const [areaId, files] of areaCounts) {
      // Encontrar padrões comuns
      const patterns = inferPatternsFromFiles([...files]);

      generatedAreas[areaId] = {
        name: getAreaName(areaId, currentConfig),
        description: getAreaDescription(areaId, currentConfig),
        patterns,
      };
    }

    // 5. Detectar padrões sugeridos para ignore
    const suggestedIgnore = detectSuggestedIgnorePatterns(allFiles);

    // 6. Criar configuração
    const newConfig: AreasConfigFile = {
      $schema: "./areas.schema.json",
      version: "1.0.0",
      ignore: suggestedIgnore,
      areas: generatedAreas,
      descriptions: {},
      settings: {
        autoDetect: true,
        inferDescriptions: true,
        groupByCategory: true,
      },
    };

    // 6. Salvar configuração
    writeConfig(cwd, newConfig);

    // 7. Montar output
    const sortedAreas = [...areaCounts.entries()].sort((a, b) => b[1].size - a[1].size);

    let out = `
✅ Arquivo criado: .analyze/areas.config.json

📦 Áreas detectadas: ${sortedAreas.length}
`;

    // Mostrar padrões de ignore se houver
    if (suggestedIgnore.length > 0) {
      out += `🚫 Padrões ignorados: ${suggestedIgnore.length}\n`;
    }
    out += `\n`;

    for (const [areaId, files] of sortedAreas.slice(0, 15)) {
      const name = getAreaName(areaId, newConfig);
      out += `   ${name.padEnd(25)} ${files.size} arquivos\n`;
    }

    if (sortedAreas.length > 15) {
      out += `   ... e mais ${sortedAreas.length - 15}\n`;
    }

    const unmappedCount = allFiles.filter(
      (f) => detectFileAreas(f, currentConfig).length === 0
    ).length;

    if (unmappedCount > 0) {
      out += `
⚠️ ${unmappedCount} arquivos sem área definida
   Use 'ai-tool areas' para ver detalhes
`;
    }

    if (suggestedIgnore.length > 0) {
      out += `
📋 Padrões adicionados ao ignore:\n`;
      for (const pattern of suggestedIgnore) {
        out += `   • ${pattern}\n`;
      }
    }

    out += `
💡 Edite o arquivo para:
   - Renomear áreas (campo "name")
   - Adicionar descrições (campo "description")
   - Ajustar padrões (campo "patterns")
   - Adicionar/remover áreas
   - Definir descrições específicas de arquivos (campo "descriptions")
`;

    return out.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar areas init: ${message}`);
  }
}

/**
 * Infere padrões glob a partir de uma lista de arquivos
 */
function inferPatternsFromFiles(files: string[]): string[] {
  const patterns = new Set<string>();

  // Agrupar por pasta pai
  const folderGroups = new Map<string, string[]>();

  for (const file of files) {
    const parts = file.split("/");
    if (parts.length > 1) {
      // Pegar até 2 níveis de pasta
      const folder = parts.slice(0, Math.min(3, parts.length - 1)).join("/");
      if (!folderGroups.has(folder)) {
        folderGroups.set(folder, []);
      }
      folderGroups.get(folder)!.push(file);
    }
  }

  // Gerar padrões para pastas com múltiplos arquivos
  for (const [folder, folderFiles] of folderGroups) {
    if (folderFiles.length >= 2) {
      patterns.add(`${folder}/**`);
    } else {
      // Arquivo único - adicionar caminho específico
      patterns.add(folderFiles[0]);
    }
  }

  // Adicionar arquivos na raiz
  for (const file of files) {
    if (!file.includes("/")) {
      patterns.add(file);
    }
  }

  return [...patterns].sort();
}

/**
 * Detecta padrões sugeridos para ignore baseado nos arquivos do projeto
 */
function detectSuggestedIgnorePatterns(files: string[]): string[] {
  const patterns: string[] = [];

  // Verificar functions/lib/
  if (files.some(f => f.includes("functions/lib/"))) {
    patterns.push("functions/lib/**");
  }

  // Verificar arquivos de teste
  const testCount = files.filter(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f)).length;
  if (testCount > 3) {
    patterns.push("**/*.test.{ts,tsx,js,jsx}");
    patterns.push("**/*.spec.{ts,tsx,js,jsx}");
  }

  // Verificar arquivos .d.ts
  const dtsCount = files.filter(f => f.endsWith(".d.ts")).length;
  if (dtsCount > 2) {
    patterns.push("**/*.d.ts");
  }

  // Verificar configurações
  const configCount = files.filter(f => 
    /\.(config|conf)\.(ts|js|mjs|cjs)$/.test(f)
  ).length;
  if (configCount > 2) {
    patterns.push("**/*.config.{ts,js,mjs,cjs}");
  }

  return patterns;
}

/**
 * Lista todos os arquivos de código do projeto recursivamente
 */
function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Ignorar pastas não relevantes
      if (IGNORED_DIRS.has(entry) || entry.startsWith(".")) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          getAllCodeFiles(fullPath, files, baseDir);
        } else {
          const ext = extname(entry).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            // Caminho relativo ao baseDir
            const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, "/");
            files.push(relativePath);
          }
        }
      } catch {
        // Ignorar arquivos inacessíveis
      }
    }
  } catch {
    // Ignorar diretórios inacessíveis
  }

  return files;
}
