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
import { suggest } from "./commands/suggest.js";
import { context, areaContext } from "./commands/context.js";
import { areas } from "./commands/areas.js";
import { area } from "./commands/area.js";
import { areasInit } from "./commands/areas-init.js";
import { find } from "./commands/find.js";
import { functions } from "./commands/functions.js";
import { VERSION } from "./index.js";
import type { FileCategory } from "./types.js";
import type { SymbolType } from "./commands/find.js";
import { resolve } from "path";

const HELP = `
ai-tool v${VERSION} - Analise de dependencias e impacto

COMANDOS:
  map                    Resumo do projeto: contagens e areas
  map --full             Mapa completo com lista de arquivos
  dead                   Detecta codigo morto (usa Knip)
  dead --fix             Remove codigo morto automaticamente
  impact <arquivo>       Analise de impacto antes de modificar
  suggest <arquivo>      Sugere arquivos para ler antes de modificar
  context <arquivo>      Extrai assinaturas de um arquivo (funcoes, tipos)
  context --area=<nome>  Contexto consolidado de toda uma area
  find <termo>           Busca simbolos no codigo (funcoes, tipos, etc)

AREAS:
  areas                  Lista todas as areas/dominios do projeto
  areas init             Gera arquivo de configuracao .analyze/areas.config.json
  areas init --force     Sobrescreve configuracao existente
  area <nome>            Mostra arquivos de uma area especifica
  area <nome> --type=hook   Filtra por categoria
  area <nome> --full     Mostra todos os arquivos

BUSCA (find):
  find <termo>           Busca definicao + usos de um simbolo
  find <termo> --type=function|type|const|component|hook|trigger
  find <termo> --area=auth   Busca apenas em uma area
  find <termo> --def     Mostra apenas definicoes
  find <termo> --refs    Mostra apenas referencias/usos

FIREBASE:
  functions              Lista todas as Cloud Functions do projeto
  functions --trigger=onCall   Filtra por tipo de trigger

MODOS:
  --mcp                  Inicia servidor MCP para integracao com Claude Desktop

OPCOES:
  --format=text|json     Formato de saida (default: text)
  --cwd=<path>           Diretorio do projeto (default: cwd)
  --no-cache             Ignora cache e forca regeneracao
  --limit=<n>            Limite de sugestoes (default: 10, apenas suggest)
  --type=<categoria>     Filtra por categoria (area) ou tipo de simbolo (find)
  --full                 Lista completa (map: lista arquivos, area: todos arquivos)
  --area=<nome>          Filtra por area (find, context)
  --def                  Apenas definicoes (find)
  --refs                 Apenas referencias (find)
  --help, -h             Mostra esta ajuda
  --version, -v          Mostra versao

CACHE:
  Resultados sao salvos em .analyze/ para acelerar execucoes futuras.
  O cache e invalidado automaticamente quando arquivos mudam.
  Use --no-cache para forcar regeneracao.

EXEMPLOS:
  ai-tool map                      # Resumo compacto
  ai-tool map --full               # Lista completa de arquivos
  ai-tool dead
  ai-tool dead --fix
  ai-tool impact Button
  ai-tool suggest Button --limit=5
  ai-tool context Button
  ai-tool context --area=auth      # Contexto de toda a area auth
  ai-tool find useAuth             # Busca definicao e usos
  ai-tool find User --type=type    # Busca apenas tipos
  ai-tool find login --area=auth   # Busca na area auth
  ai-tool areas
  ai-tool area auth
  ai-tool area auth --type=hook
  ai-tool --mcp

SOBRE:
  Criado por Koda AI Studio (kodaai.app)
  Usa Skott para analise de dependencias e Knip para dead code detection.
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

  // MCP Server mode (check ANTES do help para funcionar com --mcp sem comando)
  if (flags.mcp) {
    const { startMcpServer } = await import("./mcp/server.js");
    await startMcpServer();
    return; // Fica rodando indefinidamente via stdio
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
  const cwd = flags.cwd ? resolve(flags.cwd as string) : process.cwd();
  const cache = !flags["no-cache"]; // default: true

  try {
    let result: string;

    switch (command) {
      case "map":
        result = await map({ format, cwd, cache, full: !!flags.full });
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

      case "suggest":
        if (!target) {
          console.error("❌ Erro: arquivo alvo é obrigatório para o comando suggest");
          console.error("   Exemplo: ai-tool suggest src/components/Button.tsx");
          console.error("   Exemplo: ai-tool suggest Button");
          process.exit(1);
        }
        result = await suggest(target, {
          format,
          cwd,
          cache,
          limit: flags.limit ? Number(flags.limit) : undefined,
        });
        break;

      case "context":
        // context --area=<nome> - contexto consolidado de área
        if (flags.area) {
          result = await areaContext(flags.area as string, { format, cwd, cache });
          break;
        }
        // context <arquivo> - contexto de um arquivo
        if (!target) {
          console.error("❌ Erro: arquivo alvo é obrigatório para o comando context");
          console.error("   Exemplo: ai-tool context src/components/Button.tsx");
          console.error("   Exemplo: ai-tool context Button");
          console.error("   Exemplo: ai-tool context --area=auth");
          process.exit(1);
        }
        result = await context(target, { format, cwd });
        break;

      case "find":
        if (!target) {
          console.error("❌ Erro: termo de busca é obrigatório para o comando find");
          console.error("   Exemplo: ai-tool find useAuth");
          console.error("   Exemplo: ai-tool find User --type=type");
          console.error("   Exemplo: ai-tool find login --area=auth");
          process.exit(1);
        }
        result = await find(target, {
          format,
          cwd,
          cache,
          type: flags.type as SymbolType | undefined,
          area: flags.area as string | undefined,
          def: !!flags.def,
          refs: !!flags.refs,
        });
        break;

      case "areas":
        // Subcomando: areas init
        if (target === "init") {
          result = await areasInit({ cwd, force: !!flags.force });
        } else {
          result = await areas({ format, cwd });
        }
        break;

      case "area":
        if (!target) {
          console.error("❌ Erro: nome da área é obrigatório para o comando area");
          console.error("   Exemplo: ai-tool area auth");
          console.error("   Use 'ai-tool areas' para listar áreas disponíveis");
          process.exit(1);
        }
        result = await area(target, {
          format,
          cwd,
          type: flags.type as FileCategory | undefined,
          full: !!flags.full,
        });
        break;

      case "functions":
        result = await functions({
          format,
          cwd,
          cache,
          trigger: flags.trigger as string | undefined,
        });
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
