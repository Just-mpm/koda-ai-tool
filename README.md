# ai-tool

Ferramenta de analise de dependencias e impacto para projetos TypeScript/JavaScript.

Usa [Skott](https://github.com/antoine-coulon/skott) + [Knip](https://knip.dev) + [ts-morph](https://ts-morph.com) internamente.

## Instalacao

```bash
# Via npx (sem instalar)
npx @justmpm/ai-tool map

# Ou instalar globalmente
npm install -g @justmpm/ai-tool

# Ou como devDependency
npm install -D @justmpm/ai-tool
```

## Comandos

### `map` - Mapa do Projeto

Gera um resumo compacto do projeto com contagens, areas e alertas.

```bash
ai-tool map           # Resumo compacto (otimizado para tokens)
ai-tool map --full    # Lista completa de arquivos e pastas
ai-tool map --format=json
```

**Output (resumo):**
```
📊 486 arquivos | 97 pastas
   55 components, 40 hooks, 187 pages, 31 services, 95 utils...

🗂️ Áreas: Admin, Auth, Checkout, Dashboard, Stripe...

⚠️ 4 dependência(s) circular(es) detectada(s)
   → Use impact <arquivo> para investigar

📖 Próximos passos:
   → area <nome> - ver arquivos de uma área
   → suggest <arquivo> - o que ler antes de editar
   → context <arquivo> - ver API de um arquivo
```

**Output (--full):**
- Lista completa de arquivos por pasta
- Estrutura detalhada de pastas
- Dependencias circulares listadas

### `dead` - Codigo Morto

Detecta arquivos, exports e dependencias nao utilizados.

```bash
ai-tool dead
ai-tool dead --format=json
ai-tool dead --fix  # Remove automaticamente
```

**Detecta:**
- Arquivos orfaos (ninguem importa)
- Exports nao utilizados
- Dependencias npm nao usadas

### `impact` - Analise de Impacto

Analisa o impacto de modificar um arquivo especifico.

```bash
ai-tool impact Button
ai-tool impact src/components/Button.tsx
ai-tool impact useAuth --format=json
```

**Output:**
- **Upstream**: Quem importa este arquivo (afetados por mudancas)
- **Downstream**: O que este arquivo importa (dependencias)
- **Riscos**: Arquivo critico, dependencias circulares, etc.
- **Sugestoes**: Recomendacoes para modificacao segura

### `suggest` - Sugestao de Leitura

Sugere arquivos para ler ANTES de modificar um arquivo.

```bash
ai-tool suggest Button
ai-tool suggest src/hooks/useAuth.ts --limit=5
```

**Prioridades:**
- **Critical**: Tipos/interfaces usados pelo arquivo
- **High**: Dependencias diretas (imports)
- **Medium**: Upstream (quem usa o arquivo)
- **Low**: Testes relacionados

### `context` - Contexto do Arquivo

Extrai assinaturas de funcoes e tipos SEM a implementacao.

```bash
ai-tool context Button
ai-tool context src/hooks/useAuth.ts --format=json
ai-tool context --area=auth   # Contexto consolidado de toda uma area
```

**Extrai:**
- Imports com specifiers
- Exports do arquivo
- Funcoes com parametros e tipos de retorno
- Interfaces, types e enums com definicoes

Ideal para entender rapidamente a API publica de um arquivo.

**Contexto de Area** (`--area=<nome>`):
- Tipos e interfaces da area
- Hooks com parametros e retornos
- Funcoes principais
- Componentes React
- Services e stores
- Uma chamada = entender toda a feature

### `find` - Busca de Simbolos

Busca simbolos no codigo (funcoes, tipos, componentes, hooks, constantes, triggers).

```bash
ai-tool find useAuth              # Definicao + usos
ai-tool find User --type=type     # Busca apenas tipos
ai-tool find login --area=auth    # Busca na area auth
ai-tool find submit --def         # Apenas definicoes
ai-tool find submit --refs        # Apenas referencias/usos
ai-tool find createUser --type=trigger  # Busca Cloud Functions
```

**Tipos de simbolos:**
- `function` - Funcoes e arrow functions (inclui triggers)
- `type` - Types, interfaces e enums
- `const` - Constantes e variaveis
- `component` - Componentes React (funcao que retorna JSX)
- `hook` - React hooks (funcao que comeca com `use`)
- `trigger` - Firebase Cloud Functions (onCall, onDocumentCreated, etc.)
- `all` - Todos os tipos (default)

**Diferente de grep:** Entende o AST do TypeScript, encontra definicoes reais e onde sao usados.

### `functions` - Firebase Cloud Functions

Lista todas as Cloud Functions do projeto Firebase.

```bash
ai-tool functions                     # Lista todas as functions
ai-tool functions --trigger=onCall    # Filtra por tipo de trigger
ai-tool functions --format=json
```

**Output:**
```
⚡ CLOUD FUNCTIONS

📊 RESUMO
   Total: 12 functions
   Exportadas: 10

🌐 onCall (4)
   createCheckoutSession
      functions/src/stripe.ts:99

⏰ onSchedule (2)
   dailyCleanup
      functions/src/cron.ts:10
      schedule: every day 00:00

🔥 onDocumentCreated (3)
   onUserCreated
      functions/src/users.ts:25
      path: users/{userId}
```

**Triggers suportados (40+):**
- HTTPS: `onCall`, `onRequest`
- Firestore: `onDocumentCreated`, `onDocumentUpdated`, `onDocumentDeleted`, `onDocumentWritten` (+ variantes WithAuthContext)
- Realtime Database: `onValueCreated`, `onValueUpdated`, `onValueDeleted`, `onValueWritten`
- Scheduler: `onSchedule`
- Storage: `onObjectFinalized`, `onObjectArchived`, `onObjectDeleted`, `onMetadataUpdated`
- Pub/Sub: `onMessagePublished`
- Identity: `beforeUserCreated`, `beforeUserSignedIn`, `beforeEmailSent`, `beforeSmsSent`
- E mais: Crashlytics, Performance, Remote Config, Eventarc, Tasks, Test Lab

### `areas` - Areas/Dominios Funcionais

Lista todas as areas funcionais do projeto (auth, dashboard, stripe, etc).

```bash
ai-tool areas
ai-tool areas --format=json
```

**Output:**
- Lista de areas detectadas automaticamente
- Contagem de arquivos por area
- Distribuicao de categorias por area

### `area` - Detalhe de uma Area

Mostra todos os arquivos de uma area especifica.

```bash
ai-tool area auth
ai-tool area meus-pets --type=hook  # Filtra por categoria
ai-tool area stripe --full          # Mostra todos os arquivos
```

**Output:**
- Arquivos agrupados por categoria
- Descricao inferida de cada arquivo

### `areas init` - Configuracao de Areas

Gera arquivo de configuracao editavel para areas.

```bash
ai-tool areas init
ai-tool areas init --force  # Sobrescreve config existente
```

Cria `.analyze/areas.config.json` com:
- Areas detectadas automaticamente
- Patterns glob para cada area
- Keywords de deteccao
- Descricoes manuais de arquivos
- Padroes de ignore global

### Configuracao de Areas

O arquivo `.analyze/areas.config.json` suporta:

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
      "name": "Autenticacao",
      "description": "Sistema de login e sessao",
      "patterns": ["**/auth/**", "**/login/**"],
      "keywords": ["auth", "login", "session"]
    }
  },
  "descriptions": {
    "src/hooks/useAuth.ts": "Hook principal de autenticacao"
  },
  "settings": {
    "autoDetect": true,
    "inferDescriptions": true
  }
}
```

| Campo | Descricao |
|-------|-----------|
| `ignore` | Padroes glob para ignorar arquivos/pastas globalmente |
| `areas` | Definicao manual de areas com patterns e keywords |
| `descriptions` | Descricoes manuais para arquivos especificos |
| `settings.autoDetect` | Se `false`, usa apenas areas definidas manualmente |
| `settings.inferDescriptions` | Infere descricoes automaticamente baseado no nome |

## Servidor MCP

Integra com Claude Desktop e outras ferramentas MCP.

```bash
ai-tool --mcp
```

**Tools expostas:**
- `aitool_project_map` - Mapa do projeto (resumo compacto)
- `aitool_dead_code` - Detecta codigo morto
- `aitool_impact_analysis` - Analise de impacto antes de modificar
- `aitool_suggest_reads` - Sugere arquivos para ler antes de editar
- `aitool_file_context` - Extrai assinaturas de um arquivo
- `aitool_list_areas` - Lista areas funcionais do projeto
- `aitool_area_detail` - Arquivos de uma area especifica
- `aitool_areas_init` - Gera config de areas
- `aitool_area_context` - Contexto consolidado de toda uma area
- `aitool_find` - Busca simbolos no codigo (definicao + usos)
- `aitool_list_functions` - Lista Cloud Functions Firebase

### Configuracao Claude Code

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

### Configuracao Claude Desktop

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

## Uso Programatico

```typescript
import { map, dead, impact, suggest, context, areaContext, find, functions, areas, area, areasInit } from "@justmpm/ai-tool";

// Mapa do projeto (resumo por padrao, full: true para lista completa)
const projectMap = await map({ format: "json" });
const fullMap = await map({ format: "json", full: true });

// Codigo morto
const deadCode = await dead({ format: "json" });

// Analise de impacto
const analysis = await impact("Button", { format: "json" });

// Sugestao de leitura
const suggestions = await suggest("Button", { limit: 5 });

// Contexto do arquivo
const fileContext = await context("Button", { format: "json" });

// Contexto de uma area inteira
const authContext = await areaContext("auth", { format: "json" });

// Busca de simbolos
const symbolSearch = await find("useAuth", { type: "hook", area: "auth" });

// Cloud Functions Firebase
const cloudFunctions = await functions({ trigger: "onCall" });

// Areas funcionais
const projectAreas = await areas({ format: "json" });

// Detalhe de uma area
const authArea = await area("auth", { type: "hook" });

// Gerar config de areas
await areasInit({ force: false });
```

## Opcoes

| Opcao | Descricao | Default |
|-------|-----------|---------|
| `--format=text\|json` | Formato de saida | `text` |
| `--cwd=<path>` | Diretorio do projeto | `process.cwd()` |
| `--no-cache` | Ignora cache | `false` |
| `--full` | Lista completa (`map`: arquivos, `area`: todos) | `false` |
| `--fix` | Remove codigo morto (so `dead`) | `false` |
| `--limit=<n>` | Limite de sugestoes (so `suggest`) | `10` |
| `--type=<cat>` | Filtra por categoria (`area`) ou tipo de simbolo (`find`) | - |
| `--area=<nome>` | Filtra por area (`context`, `find`) | - |
| `--def` | Mostra apenas definicoes (so `find`) | `false` |
| `--refs` | Mostra apenas referencias/usos (so `find`) | `false` |
| `--mcp` | Inicia servidor MCP | - |

## Categorias de Arquivos

| Categoria | Descricao |
|-----------|-----------|
| `page` | Paginas (Next.js, etc.) |
| `layout` | Layouts |
| `route` | Rotas de API |
| `component` | Componentes React/Vue |
| `hook` | React Hooks |
| `service` | Servicos/API |
| `store` | Estado global |
| `util` | Utilitarios |
| `type` | Tipos TypeScript |
| `config` | Configuracoes |
| `test` | Testes |
| `cloud-function` | Firebase Cloud Functions |
| `other` | Outros |

## Cache

Resultados sao salvos em `.analyze/` para acelerar execucoes futuras.

- Cache e invalidado automaticamente quando arquivos mudam
- Use `--no-cache` para forcar regeneracao
- Adicione `.analyze/` ao `.gitignore`

## Requisitos

- Node.js >= 18.0.0
- Projeto TypeScript/JavaScript

## Creditos

- [Skott](https://github.com/antoine-coulon/skott) - Analise de dependencias
- [Knip](https://knip.dev) - Deteccao de codigo morto
- [ts-morph](https://ts-morph.com) - Analise AST

## Licenca

MIT - [Koda AI Studio](https://kodaai.app)
