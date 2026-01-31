# ai-tool

Pacote npm para analise de dependencias, codigo morto e areas funcionais em projetos TS/JS.

## O que faz

- **`map`** - Gera mapa do projeto com categorizacao automatica de arquivos
- **`dead`** - Detecta arquivos orfaos, exports nao usados, deps npm mortas
- **`impact <arquivo>`** - Analisa upstream/downstream de um arquivo especifico
- **`suggest <arquivo>`** - Sugere arquivos para ler antes de modificar
- **`context <arquivo>`** - Extrai assinaturas de funcoes e tipos (sem implementacao)
- **`areas`** - Lista todas as areas/dominios funcionais do projeto
- **`area <nome>`** - Mostra arquivos de uma area especifica
- **`areas init`** - Gera arquivo de configuracao de areas

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
- `aitool_list_areas`
- `aitool_area_detail`

## Frameworks suportados

- Next.js (App Router e Pages Router)
- Vite (React, Vue)
- Create React App
- Remix
- Nuxt
- SvelteKit
- Astro

## Stack interna

- [Skott](https://github.com/antoine-coulon/skott) - Analise de dependencias
- [Knip](https://knip.dev) - Deteccao de codigo morto
- [ts-morph](https://ts-morph.com) - Analise AST para extracoes
- [minimatch](https://github.com/isaacs/minimatch) - Pattern matching para areas

## Estrutura

```
src/
  commands/     # Comandos CLI (map, dead, impact, suggest, context, areas, area)
  areas/        # Sistema de deteccao de areas
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
# Analise basica
npx ai-tool map                    # Mapa do projeto
npx ai-tool dead                   # Codigo morto
npx ai-tool dead --fix             # Remove codigo morto

# Analise de arquivos
npx ai-tool impact Button          # Impacto de mudanca
npx ai-tool suggest Button         # Arquivos para ler antes de modificar
npx ai-tool context Button         # Assinaturas do arquivo

# Areas funcionais (NOVO em v0.4.0)
npx ai-tool areas                  # Lista todas as areas
npx ai-tool areas init             # Gera configuracao inicial
npx ai-tool area meus-pets         # Arquivos da area "meus-pets"
npx ai-tool area auth --type=hook  # Apenas hooks da area "auth"
npx ai-tool area stripe --full     # Todos os arquivos da area

# MCP
npx ai-tool --mcp                  # Servidor MCP
```

Opcoes: `--format=text|json`, `--cwd=<path>`, `--no-cache`, `--limit=<n>`, `--type=<categoria>`, `--full`

## Configuracao de Areas

O arquivo `.analyze/areas.config.json` permite personalizar as areas:

```json
{
  "areas": {
    "meus-pets": {
      "name": "Meus Pets",
      "description": "Gerenciamento de pets",
      "patterns": ["components/pets/**", "app/**/meus-pets/**"],
      "keywords": ["pet", "vaccination"]
    }
  },
  "descriptions": {
    "components/pets/PetForm.tsx": "Formulario multi-step de pets"
  }
}
```
