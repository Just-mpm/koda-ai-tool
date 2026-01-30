# ai-tool

Pacote npm para analise de dependencias e codigo morto em projetos TS/JS.

## O que faz

- **`map`** - Gera mapa do projeto com categorizacao automatica de arquivos
- **`dead`** - Detecta arquivos orfaos, exports nao usados, deps npm mortas
- **`impact <arquivo>`** - Analisa upstream/downstream de um arquivo especifico
- **`suggest <arquivo>`** - Sugere arquivos para ler antes de modificar
- **`context <arquivo>`** - Extrai assinaturas de funcoes e tipos (sem implementacao)

## Servidor MCP

```bash
ai-tool --mcp  # Inicia servidor MCP via stdio
```

Tools expostas:
- `aitool_project_map`
- `aitool_dead_code`
- `aitool_impact_analysis`
- `aitool_suggest_reads`
- `aitool_file_context`

## Stack interna

- [Skott](https://github.com/antoine-coulon/skott) - Analise de dependencias
- [Knip](https://knip.dev) - Deteccao de codigo morto
- [ts-morph](https://ts-morph.com) - Analise AST para extracoes

## Estrutura

```
src/
  commands/     # Comandos CLI (map, dead, impact, suggest, context)
  mcp/          # Servidor MCP
  ts/           # Extrator TypeScript (ts-morph)
  formatters/   # Formatadores text/json
  cache/        # Sistema de cache
  utils/        # Utilitarios
dist/           # Build compilado
```

## Comandos uteis

```bash
npm run build    # Compila TypeScript
npx ai-tool map  # Testa localmente
```

## Uso

```bash
npx ai-tool map                    # Mapa do projeto
npx ai-tool dead                   # Codigo morto
npx ai-tool dead --fix             # Remove codigo morto
npx ai-tool impact Button          # Impacto de mudanca
npx ai-tool suggest Button         # Arquivos para ler antes de modificar
npx ai-tool context Button         # Assinaturas do arquivo
npx ai-tool --mcp                  # Servidor MCP
```

Opcoes: `--format=text|json`, `--cwd=<path>`, `--no-cache`, `--limit=<n>`
