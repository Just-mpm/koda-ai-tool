# ai-tool

Pacote npm para análise de dependências, código morto e áreas funcionais em projetos TS/JS.

## O que faz

### Análise de Projeto
- **`map`** - Resumo compacto do projeto: contagens, áreas, alertas
- **`map --full`** - Lista completa de arquivos e pastas
- **`dead`** - Detecta arquivos órfãos, exports não usados, deps npm mortas

### Análise de Arquivos
- **`impact <arquivo>`** - Analisa upstream/downstream de um arquivo específico
  - Inclui histórico Git (últimos commits do arquivo)
- **`suggest <arquivo>`** - Sugere arquivos para ler antes de modificar
  - Inclui sugestões de testes baseadas nos arquivos afetados
- **`context <arquivo>`** - Extrai assinaturas de funções e tipos (sem implementação)
- **`context --area=<nome>`** - Contexto consolidado de toda uma área (tipos, hooks, funções, etc)

### Busca de Símbolos
- **`find <termo>`** - Busca símbolos no código (definição + usos)
- **`find <termo> --type=function|type|const|component|hook`** - Filtra por tipo
- **`find <termo> --area=<nome>`** - Busca apenas em uma área
- **`find <termo> --def`** - Mostra apenas definições
- **`find <termo> --refs`** - Mostra apenas referências/usos

### Busca por Descrição (NOVO)
- **`describe <termo>`** - Busca áreas por descrição em linguagem natural
  - Ex: `npx ai-tool describe "autenticação"` → encontra área de autenticação
  - Correções automáticas via Levenshtein ("autenticacao" → "autenticação")
  - Sugestões quando não encontra nada

### Firebase Cloud Functions
- **`functions`** - Lista todas as Cloud Functions do projeto
- **`functions --trigger=onCall`** - Filtra por tipo de trigger
- **`find <nome> --type=trigger`** - Busca Cloud Functions específicas

### Áreas Funcionais (Configuração Manual Obrigatória)
- **`areas`** - Lista todas as áreas/domínios funcionais do projeto
- **`area <nome>`** - Mostra arquivos de uma área específica (use ID ou Name)
- **`areas init`** - Gera arquivo de configuração `.analyze/areas.config.json`

## Servidor MCP

```bash
ai-tool --mcp  # Inicia servidor MCP via stdio
```

Tools expostas:
- `aitool_project_map` - Mapa do projeto (resumo compacto)
- `aitool_dead_code` - Detecta código morto
- `aitool_impact_analysis` - Análise de impacto antes de modificar
- `aitool_suggest_reads` - Sugere arquivos para ler antes de editar
  - Inclui sugestões de testes
- `aitool_file_context` - Extrai assinaturas de um arquivo
- `aitool_list_areas` - Lista áreas funcionais do projeto
- `aitool_area_detail` - Arquivos de uma área específica
- `aitool_areas_init` - Gera config de áreas
- `aitool_area_context` - Contexto consolidado de toda uma área
- `aitool_describe` - Busca áreas por descrição (keywords + Levenshtein)
- `aitool_find` - Busca símbolos no código: definição + usos
- `aitool_list_functions` - Lista Cloud Functions Firebase

### Configuração Claude Code

Adicione ao `.mcp.json` do projeto ou ao arquivo global `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "analyze": {
      "command": "npx",
      "args": ["-y", "@justmpm/ai-tool", "--mcp"]
    }
  }
}
```

### Configuração Claude Desktop

Adicione ao `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "analyze": {
      "command": "npx",
      "args": ["-y", "@justmpm/ai-tool", "--mcp"]
    }
  }
}
```

## Frameworks Suportados

- Next.js (App Router e Pages Router)
- Vite (React, Vue)
- Create React App
- Remix
- Nuxt
- SvelteKit
- Astro
- Firebase Cloud Functions v2

## Stack Interna

- [Skott](https://github.com/antoine-coulon/skott) - Análise de dependências
- [Knip](https://knip.dev) - Detecção de código morto
- [ts-morph](https://ts-morph.com) - Análise AST para extrações
- [minimatch](https://github.com/isaacs/minimatch) - Pattern matching para áreas
- [Zod](https://zod.dev) - Validação de tipos (schemas MCP, cache)

## Estrutura

```
src/
  commands/     # Comandos CLI (map, dead, impact, suggest, context, find, describe, functions, areas, area, areas-init)
  areas/        # Sistema de configuração manual de áreas
  mcp/          # Servidor MCP + tools
    ├── server.ts             # Setup do servidor
    └── tools.ts              # Registro de todas as tools
  ts/           # Extrator TypeScript (ts-morph) + indexador de símbolos
    ├── index.ts              # Indexação principal
    ├── extractor.ts          # Extração de símbolos
    ├── utils.ts              # Funções compartilhadas
    ├── triggers.ts           # Detecção de triggers Firebase
    └── cache.ts              # Cache de símbolos
  formatters/   # Formatadores de saída (text, json)
  cache/        # Sistema de cache (graph, dead, symbols)
    ├── index.ts              # Cache com validação Zod
    └── schemas.ts            # Schemas Zod para validação
  utils/        # Utilitários (detect, errors, firebase, similarity, logger, file-matcher)
  integrations/ # Integrações externas
    └── git.ts                # Integração Git (getCommitsForFile, getBlameInfo)
  dist/           # Build compilado
```

## Uso

```bash
# Análise básica
npx ai-tool map                      # Resumo compacto (contagens + áreas + alertas)
npx ai-tool map --full               # Lista completa de arquivos
npx ai-tool dead
npx ai-tool dead --fix

# Análise de arquivos
npx ai-tool impact Button          # Impacto de mudança (inclui histórico Git)
npx ai-tool suggest Button         # Arquivos para ler antes de modificar (inclui sugestões de testes)
npx ai-tool context Button         # Assinaturas do arquivo
npx ai-tool context --area=auth    # Contexto consolidado da área auth

# Busca por descrição (NOVO)
npx ai-tool describe cache           # Busca áreas por descrição
npx ai-tool describe "autenticação"
npx ai-tool describe login --format=json

# Busca de símbolos
npx ai-tool find useAuth             # Definição + usos de useAuth
npx ai-tool find User --type=type    # Busca apenas tipos
npx ai-tool find login --area=auth   # Busca na área auth
npx ai-tool find submit --def      # Apenas definições
npx ai-tool find submit --refs     # Apenas referências/usos

# Áreas funcionais
npx ai-tool areas                  # Lista todas as áreas
npx ai-tool areas init             # Gera configuração inicial (TEMPLATE)
npx ai-tool area auth              # Arquivos da área "auth" (use ID)
npx ai-tool area "Autenticação"    # Também funciona (use Name)
npx ai-tool area auth --type=hook  # Apenas hooks da área "auth"
npx ai-tool area dashboard --full  # Todos os arquivos da área

# Firebase Cloud Functions
npx ai-tool functions                   # Lista todas as Cloud Functions
npx ai-tool functions --trigger=onCall  # Filtra por tipo de trigger
npx ai-tool find createUser --type=trigger  # Busca uma Cloud Function

# MCP
npx ai-tool --mcp
```

## Novidades na v0.9.0

### Comando `describe` - Busca por Descrição
Busca áreas funcionais por descrição em linguagem natural usando keywords + correções via Levenshtein.

```bash
npx ai-tool describe "autenticação"
```

**Output:**
```
🔍 Busca: "autenticação"

## Autenticação (auth)
Sistema de login, signup e gerenciamento de sessão
📁 15 arquivo(s)

Arquivos:
   • [Use 'ai-tool area auth' para ver arquivos completos]

📖 Próximos passos:
   → ai-tool area <id> - ver detalhes de uma área
   → ai-tool context --area=<id> - contexto completo de uma área
```

### Integração Git
Comando `impact` agora mostra histórico de commits do arquivo alvo.

**Output:**
```
📜 HISTÓRICO GIT (últimos 5 commits)

   abc1234 - Corrige bug no matcher (Matheus)
   def5678 - Adiciona prioridades (Matheus)
   ...
```

### Testes Inteligentes
Comando `suggest` agora inclui sugestões de testes baseadas nos arquivos afetados.

**Output:**
```
💡 SUGESTÕES DE TESTES

   → Rode os testes: tests/commands/impact.test.ts
   → Rode os testes: tests/utils/file-matcher.test.ts

💡 Se não encontrou testes relacionados, considere criar testes para os arquivos modificados
```

### Refatorações Arquiteturais
- **src/mcp/server.ts** reduzido de 674 para 36 linhas (95% de redução)
- **src/ts/indexer.ts** dividido em 3 módulos: `index.ts` (219 linhas), `cache.ts` (519 linhas), `triggers.ts` (302 linhas)
- **Zero duplicações**: Funções `findTargetFile`, `simplifyType`, `formatInterfaceDefinition` extraídas para módulos compartilhados
- **Type safety**: Validação Zod para cache com migração automática (schemaVersion=2.0.0)
- **113 testes**: Suite de testes completa com 100% de pass rate

## Opções

| Opção | Descrição | Default |
|-------|-----------|---------|
| `--format=text\|json` | Formato de saída | `text` |
| `--cwd=<path>` | Diretório do projeto | `process.cwd()` |
| `--no-cache` | Ignora cache e força regeneração | `false` |
| `--full` | Lista completa (`map`: arquivos, `area`: todos) | `false` |
| `--fix` | Remove código morto (só `dead`) | `false` |
| `--limit=<n>` | Limite de sugestões (só `suggest`) | `10` |
| `--type=<cat>` | Filtra por categoria (`area`) ou tipo de símbolo (`find`) | - |
| `--area=<nome>` | Filtra por área (`context`, `find`) | - |
| `--def` | Apenas definições (só `find`) | `false` |
| `--refs` | Apenas referências/usos (só `find`) | `false` |
| `--mcp` | Inicia servidor MCP | - |

## Categorias de Arquivos

| Categoria | Descrição |
|-----------|-----------|
| `page` | Páginas (Next.js, etc.) |
| `layout` | Layouts |
| `route` | Rotas de API |
| `component` | Componentes React/Vue |
| `hook` | React Hooks |
| `service` | Serviços/API |
| `store` | Estado global |
| `util` | Utilitários |
| `type` | Tipos TypeScript |
| `config` | Configurações |
| `test` | Testes |
| `cloud-function` | Firebase Cloud Functions |
| `other` | Outros |

## Tipos de Símbolos (para `find`)

| Tipo | Descrição |
|------|-----------|
| `function` | Funções e arrow functions (inclui triggers) |
| `type` | Types, interfaces e enums |
| `const` | Constantes e variáveis |
| `component` | Componentes React |
| `hook` | React hooks |
| `trigger` | Firebase Cloud Functions (onCall, onDocumentCreated, etc.) |
| `all` | Todos os tipos (default) |

## Configuração de Áreas

**IMPORTANTE:** A partir da versão 0.8.0, o sistema de áreas usa **APENAS configuração manual**.

Primeiro, execute `areas init` para gerar o template:

```bash
ai-tool areas init
```

Isso cria `.analyze/areas.config.json` com um template baseado no framework detectado.

### Estrutura do Config

```json
{
  "$schema": "./areas.schema.json",
  "version": "1.0.0",
  "ignore": [
    "docs/brainstorming/**",
    "functions/lib/**",
    "**/*.test.ts"
  ],
  "areas": {
    "auth": {
      "name": "Autenticação",
      "description": "Login, signup e gerenciamento de sessão",
      "patterns": ["src/pages/Auth/**", "src/components/auth/**"],
      "keywords": ["auth", "login", "signup"]
    },
    "meus-pets": {
      "name": "Meus Pets",
      "description": "Gerenciamento de pets do usuário",
      "patterns": [
        "app/meus-pets/**",
        "components/pets/**",
        "hooks/usePets.*",
        "services/petService.*"
      ],
      "keywords": ["pet", "animal"],
      "exclude": ["components/pets/shared/**"]
    }
  },
  "descriptions": {
    "src/hooks/useAuth.ts": "Hook principal de autenticação",
    "src/services/petService.ts": "Serviço de gerenciamento de pets"
  },
  "settings": {
    "autoDetect": false,
    "inferDescriptions": true,
    "groupByCategory": true
  }
}
```

| Campo | Descrição |
|-------|-----------|
| `ignore` | Padrões glob para ignorar arquivos/pastas globalmente |
| `areas` | Definição manual de áreas com patterns e keywords |
| `areas.<id>.name` | Nome amigável da área |
| `areas.<id>.description` | Descrição do domínio de negócio |
| `areas.<id>.patterns` | Padrões glob que identificam arquivos da área |
| `areas.<id>.keywords` | Keywords no caminho do arquivo |
| `areas.<id>.exclude` | Padrões para excluir arquivos específicos |
| `descriptions` | Descrições manuais para arquivos específicos |
| `settings.autoDetect` | **Sempre `false`** - configuração manual obrigatória |
| `settings.inferDescriptions` | Infere descrições automaticamente baseado no nome |
| `settings.groupByCategory` | Agrupa arquivos por categoria nos comandos |

### Boas Práticas

- Ideal: 5-15 áreas (muitas áreas é difícil de navegar)
- Use patterns para pastas: `"app/dashboard/**"`
- Use keywords para arquivos espalhados: `["auth", "login"]`
- Um arquivo pode pertencer a múltiplas áreas
- Use `exclude` para remover arquivos específicos de uma área

## Cache

Resultados são salvos em `.analyze/` para acelerar execuções futuras.

- Cache é invalidado automaticamente quando arquivos mudam
- Use `--no-cache` para forçar regeneração
- Adicione `.analyze/` ao `.gitignore`
- **Migração automática:** Caches antigos (sem `schemaVersion`) são invalidados automaticamente

## Requisitos

- Node.js >= 18.0.0
- Projeto TypeScript/JavaScript

## Créditos

- [Skott](https://github.com/antoine-coulon/skott) - Análise de dependências
- [Knip](https://knip.dev) - Detecção de código morto
- [ts-morph](https://ts-morph.com) - Análise AST

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
