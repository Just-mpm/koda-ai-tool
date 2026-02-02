# ai-tool

Pacote npm para analise de dependencias, codigo morto e areas funcionais em projetos TS/JS.

## O que faz

### Analise de Projeto
- **`map`** - Resumo compacto do projeto: contagens, areas, alertas
- **`map --full`** - Lista completa de arquivos e pastas
- **`dead`** - Detecta arquivos orfaos, exports nao usados, deps npm mortas

### Analise de Arquivos
- **`impact <arquivo>`** - Analisa upstream/downstream de um arquivo especifico
- **`suggest <arquivo>`** - Sugere arquivos para ler antes de modificar
- **`context <arquivo>`** - Extrai assinaturas de funcoes e tipos (sem implementacao)
- **`context --area=<nome>`** - Contexto consolidado de toda uma area (tipos, hooks, funcoes, etc)

### Busca de Simbolos (novo em 0.6.0)
- **`find <termo>`** - Busca simbolos no codigo (definicao + usos)
- **`find <termo> --type=function|type|const|component|hook`** - Filtra por tipo
- **`find <termo> --area=<nome>`** - Busca apenas em uma area
- **`find <termo> --def`** - Mostra apenas definicoes
- **`find <termo> --refs`** - Mostra apenas referencias/usos

### Areas Funcionais
- **`areas`** - Lista todas as areas/dominios funcionais do projeto
- **`area <nome>`** - Mostra arquivos de uma area especifica
- **`areas init`** - Gera arquivo de configuracao de areas

## Servidor MCP

```bash
ai-tool --mcp  # Inicia servidor MCP via stdio
```

Tools expostas:
- `aitool_project_map` - Mapa do projeto (resumo compacto)
- `aitool_dead_code` - Detecta codigo morto
- `aitool_impact_analysis` - Analise de impacto antes de modificar
- `aitool_suggest_reads` - Sugere arquivos para ler antes de editar
- `aitool_file_context` - Extrai assinaturas de um arquivo
- `aitool_list_areas` - Lista areas funcionais do projeto
- `aitool_area_detail` - Arquivos de uma area especifica
- `aitool_areas_init` - Gera config de areas
- `aitool_area_context` - Contexto consolidado de toda uma area (novo em 0.6.0)
- `aitool_find` - Busca simbolos no codigo: definicao + usos (novo em 0.6.0)

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
  commands/     # Comandos CLI (map, dead, impact, suggest, context, find, areas, area)
  areas/        # Sistema de deteccao de areas
  mcp/          # Servidor MCP
  ts/           # Extrator TypeScript (ts-morph) + indexador de simbolos
  formatters/   # Formatadores text/json
  cache/        # Sistema de cache (graph, dead, symbols)
  utils/        # Utilitarios (detect, firebase, similarity, errors)
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
npx ai-tool map                    # Resumo compacto (contagens + areas + alertas)
npx ai-tool map --full             # Lista completa de arquivos
npx ai-tool dead                   # Codigo morto
npx ai-tool dead --fix             # Remove codigo morto

# Analise de arquivos
npx ai-tool impact Button          # Impacto de mudanca
npx ai-tool suggest Button         # Arquivos para ler antes de modificar
npx ai-tool context Button         # Assinaturas do arquivo
npx ai-tool context --area=auth    # Contexto consolidado da area auth

# Busca de simbolos
npx ai-tool find useAuth           # Definicao + usos de useAuth
npx ai-tool find User --type=type  # Busca apenas tipos
npx ai-tool find login --area=auth # Busca na area auth
npx ai-tool find submit --def      # Apenas definicoes
npx ai-tool find submit --refs     # Apenas referencias/usos

# Areas funcionais
npx ai-tool areas                  # Lista todas as areas
npx ai-tool areas init             # Gera configuracao inicial
npx ai-tool area auth              # Arquivos da area "auth"
npx ai-tool area auth --type=hook  # Apenas hooks da area "auth"
npx ai-tool area dashboard --full  # Todos os arquivos da area

# MCP
npx ai-tool --mcp                  # Servidor MCP
```

Opcoes: `--format=text|json`, `--cwd=<path>`, `--no-cache`, `--limit=<n>`, `--type=<categoria>`, `--full`, `--area=<nome>`, `--def`, `--refs`

## Configuracao de Areas

O arquivo `.analyze/areas.config.json` permite personalizar as areas:

```json
{
  "areas": {
    "auth": {
      "name": "Autenticacao",
      "description": "Login, signup e gerenciamento de sessao",
      "patterns": ["src/pages/Auth/**", "src/components/auth/**"],
      "keywords": ["auth", "login", "signup"]
    }
  },
  "descriptions": {
    "src/hooks/useAuth.ts": "Hook principal de autenticacao"
  },
  "settings": {
    "autoDetect": false
  }
}
```

### autoDetect

- `true` (default): usa config manual + padroes automaticos
- `false`: usa APENAS a configuracao manual (recomendado para projetos com dominios especificos)

## Sugestoes Inteligentes

Quando usuario digita errado, o sistema sugere correcoes:

```bash
$ ai-tool area auht
Erro: Area nao encontrada: "auht"

Voce quis dizer?
   -> ai-tool area auth
```

Funciona para arquivos e areas, considerando tanto config manual quanto automatica.
