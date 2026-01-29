#!/usr/bin/env node

/**
 * ai-tool CLI
 *
 * Ferramenta de análise de dependências e impacto para projetos TypeScript/JavaScript.
 *
 * COMANDOS:
 *   ai-tool map              Mapa completo do projeto
 *   ai-tool dead             Detecta código morto
 *   ai-tool impact <arquivo> Análise de impacto
 *
 * OPÇÕES:
 *   --format=text|json       Formato de saída (default: text)
 *   --cwd=<path>             Diretório do projeto
 *   --no-cache               Ignora cache e força regeneração
 *   --help                   Mostra ajuda
 *   --version                Mostra versão
 */

import { map } from "./commands/map.js";
import { dead, deadFix } from "./commands/dead.js";
import { impact } from "./commands/impact.js";
import { VERSION } from "./index.js";

const HELP = `
ai-tool v${VERSION} - Análise de dependências e impacto

COMANDOS:
  map                    Mapa completo do projeto (usa Skott)
  dead                   Detecta código morto (usa Knip)
  dead --fix             Remove código morto automaticamente
  impact <arquivo>       Análise de impacto antes de modificar

OPÇÕES:
  --format=text|json     Formato de saída (default: text)
  --cwd=<path>           Diretório do projeto (default: cwd)
  --no-cache             Ignora cache e força regeneração
  --help, -h             Mostra esta ajuda
  --version, -v          Mostra versão

CACHE:
  Resultados são salvos em .analyze/ para acelerar execuções futuras.
  O cache é invalidado automaticamente quando arquivos mudam.
  Use --no-cache para forçar regeneração.

EXEMPLOS:
  ai-tool map
  ai-tool map --format=json
  ai-tool map --no-cache
  ai-tool dead
  ai-tool dead --fix
  ai-tool impact Button
  ai-tool impact src/hooks/useAuth.ts
  ai-tool impact src/components/Header.tsx --format=json

SOBRE:
  Criado por Koda AI Studio (kodaai.app)
  Usa Skott para análise de dependências e Knip para dead code detection.
`;

async function main() {
  const args = process.argv.slice(2);

  // Parse argumentos
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value ?? true;
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  // Help
  if (flags.help || flags.h || positional.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  // Version
  if (flags.version || flags.v) {
    console.log(`ai-tool v${VERSION}`);
    process.exit(0);
  }

  const command = positional[0];
  const target = positional[1];
  const format = (flags.format as "text" | "json") || "text";
  const cwd = (flags.cwd as string) || process.cwd();
  const cache = !flags["no-cache"]; // default: true

  try {
    let result: string;

    switch (command) {
      case "map":
        result = await map({ format, cwd, cache });
        break;

      case "dead":
        if (flags.fix) {
          result = await deadFix({ cwd });
        } else {
          result = await dead({ format, cwd, cache });
        }
        break;

      case "impact":
        if (!target) {
          console.error("❌ Erro: arquivo alvo é obrigatório para o comando impact");
          console.error("   Exemplo: ai-tool impact src/components/Button.tsx");
          console.error("   Exemplo: ai-tool impact Button");
          process.exit(1);
        }
        result = await impact(target, { format, cwd, cache });
        break;

      default:
        console.error(`❌ Comando desconhecido: ${command}`);
        console.error("   Use 'ai-tool --help' para ver comandos disponíveis.");
        process.exit(1);
    }

    console.log(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Erro: ${message}`);
    process.exit(1);
  }
}

main();
