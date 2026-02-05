# ai-tool

Ferramenta de análise de dependências e impacto para projetos TypeScript/JavaScript.

Usa [Skott](https://github.com/antoine-coulon/skott) + [Knip](https://knip.dev) + [ts-morph](https://ts-morph.com) internamente.

## Instalação

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

Gera um resumo compacto do projeto com contagens, áreas e alertas.

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
- Dependências circulares listadas

### `dead` - Código Morto

Detecta arquivos, exports e dependências não utilizados.

```bash
ai-tool dead
ai-tool dead --format=json
ai-tool dead --fix  # Remove automaticamente
```

**Detecta:**
- Arquivos órfãos (ninguém importa)
- Exports não utilizados
- Dependências npm não usadas

### `impact` - Análise de Impacto

Analisa o impacto de modificar um arquivo específico.

```bash
ai-tool impact Button
ai-tool impact src/components/Button.tsx
ai-tool impact useAuth --format=json
```

**Output:**
- **Upstream**: Quem importa este arquivo (afetados por mudanças)
- **Downstream**: O que este arquivo importa (dependências)
- **Riscos**: Arquivo crítico, dependências circulares, etc.
- **Sugestões**: Recomendações para modificação segura

### `suggest` - Sugestão de Leitura

Sugere arquivos para ler ANTES de modificar um arquivo.

```bash
ai-tool suggest Button
ai-tool suggest src/hooks/useAuth.ts --limit=5
```

**Prioridades:**
- **Critical**: Tipos/interfaces usados pelo arquivo
- **High**: Dependências diretas (imports)
- **Medium**: Upstream (quem usa o arquivo)
- **Low**: Testes relacionados

### `context` - Contexto do Arquivo

Extrai assinaturas de funções e tipos SEM a implementação.

```bash
ai-tool context Button
ai-tool context src/hooks/useAuth.ts --format=json
ai-tool context --area=auth   # Contexto consolidado de toda uma área
```

**Extrai:**
- Imports com specifiers
- Exports do arquivo
- Funções com parâmetros e tipos de retorno
- Interfaces, types e enums com definições

Ideal para entender rapidamente a API pública de um arquivo.

**Contexto de Área** (`--area=<nome>`):
- Tipos e interfaces da área
- Hooks com parâmetros e retornos
- Funções principais
- Componentes React
- Services e stores
- Uma chamada = entender toda a feature

### `find` - Busca de Símbolos

Busca símbolos no código (funções, tipos, componentes, hooks, constantes, triggers).

```bash
ai-tool find useAuth              # Definição + usos
ai-tool find User --type=type     # Busca apenas tipos
ai-tool find login --area=auth    # Busca na área auth
ai-tool find submit --def         # Apenas definições
ai-tool find submit --refs        # Apenas referências/usos
ai-tool find createUser --type=trigger  # Busca Cloud Functions
```

**Tipos de símbolos:**
- `function` - Funções e arrow functions (inclui triggers)
- `type` - Types, interfaces e enums
- `const` - Constantes e variáveis
- `component` - Componentes React (função que retorna JSX)
- `hook` - React hooks (função que começa com `use`)
- `trigger` - Firebase Cloud Functions (onCall, onDocumentCreated, etc.)
- `all` - Todos os tipos (default)

**Diferente de grep:** Entende o AST do TypeScript, encontra definições reais e onde são usados.

### `describe` - Busca por Descrição

Busca áreas funcionais por descrição em linguagem natural usando keywords + correções via Levenshtein.

```bash
ai-tool describe "autenticação"
ai-tool describe login --format=json
ai-tool describe "onde implementou checkout"
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

**Sem resultados:**
```
❌ Nenhuma área encontrada para: "autenticaçao"

💡 Você quis dizer?
   → ai-tool describe autenticação
   → ai-tool describe auth

📖 Dica: Use 'ai-tool areas' para listar todas as áreas disponíveis
```

**Funcionalidades:**
- Busca por keywords em descrições, nomes e IDs de áreas
- Correções automáticas via Levenshtein ("autenticacao" → "autenticação")
- Sugestões de buscas alternativas quando não encontra nada

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

### `areas` - Áreas/Domínios Funcionais

Lista todas as áreas funcionais do projeto (auth, dashboard, stripe, etc).

```bash
ai-tool areas
ai-tool areas --format=json
```

**Output:**
- Lista de áreas configuradas manualmente
- Contagem de arquivos por área
- Distribuição de categorias por área

### `area` - Detalhe de uma Área

Mostra todos os arquivos de uma área específica.

```bash
ai-tool area auth
ai-tool area meus-pets --type=hook  # Filtra por categoria
ai-tool area stripe --full          # Mostra todos os arquivos
```

**Output:**
- Arquivos agrupados por categoria
- Descrição inferida de cada arquivo

### `areas init` - Configuração de Áreas

Gera arquivo de configuração editável para áreas.

```bash
ai-tool areas init
ai-tool areas init --force  # Sobrescreve config existente
```

Cria `.analyze/areas.config.json` com:
- Template de áreas baseado no framework detectado
- Patterns glob para cada área
- Keywords de detecção
- Descrições manuais de arquivos
- Padrões de ignore global

### Configuração de Áreas

O arquivo `.analyze/areas.config.json` é a **fonte de verdade** para organização do projeto por domínios funcionais.

**Estrutura completa:**

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
      "description": "Sistema de login e sessão",
      "patterns": ["**/auth/**", "**/login/**"],
      "keywords": ["auth", "login", "session"]
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

**Boas práticas:**

- Ideal: 5-15 áreas (muitas áreas é difícil de navegar)
- Use patterns para pastas: `"app/dashboard/**"`
- Use keywords para arquivos espalhados: `["auth", "login"]`
- Um arquivo pode pertencer a múltiplas áreas
- Use `exclude` para remover arquivos específicos de uma área

## Servidor MCP

Integra com Claude Desktop e outras ferramentas MCP.

```bash
ai-tool --mcp
```

**Tools expostas:**
- `aitool_project_map` - Mapa do projeto (resumo compacto)
- `aitool_dead_code` - Detecta código morto
- `aitool_impact_analysis` - Análise de impacto antes de modificar
- `aitool_suggest_reads` - Sugere arquivos para ler antes de editar
- `aitool_file_context` - Extrai assinaturas de um arquivo
- `aitool_list_areas` - Lista áreas funcionais do projeto
- `aitool_area_detail` - Arquivos de uma área específica
- `aitool_areas_init` - Gera config de áreas
- `aitool_area_context` - Contexto consolidado de toda uma área
- `aitool_describe` - Busca áreas por descrição (keywords + Levenshtein)
- `aitool_find` - Busca símbolos no código (definição + usos)
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

## Uso Programático

```typescript
import { map, dead, impact, suggest, context, describe, areaContext, find, functions, areas, area, areasInit } from "@justmpm/ai-tool";

// Mapa do projeto (resumo por padrão, full: true para lista completa)
const projectMap = await map({ format: "json" });
const fullMap = await map({ format: "json", full: true });

// Código morto
const deadCode = await dead({ format: "json" });

// Análise de impacto
const analysis = await impact("Button", { format: "json" });

// Sugestão de leitura
const suggestions = await suggest("Button", { limit: 5 });

// Contexto do arquivo
const fileContext = await context("Button", { format: "json" });

// Contexto de uma área inteira
const authContext = await areaContext("auth", { format: "json" });

// Busca de símbolos
const symbolSearch = await find("useAuth", { type: "hook", area: "auth" });

// Busca por descrição
const authAreaSearch = await describe("autenticação");

// Cloud Functions Firebase
const cloudFunctions = await functions({ trigger: "onCall" });

// Áreas funcionais
const projectAreas = await areas({ format: "json" });

// Detalhe de uma área
const authArea = await area("auth", { type: "hook" });

// Gerar config de áreas
await areasInit({ force: false });
```

## Opções

| Opção | Descrição | Default |
|-------|-----------|---------|
| `--format=text\|json` | Formato de saída | `text` |
| `--cwd=<path>` | Diretório do projeto | `process.cwd()` |
| `--no-cache` | Ignora cache | `false` |
| `--full` | Lista completa (`map`: arquivos, `area`: todos) | `false` |
| `--fix` | Remove código morto (só `dead`) | `false` |
| `--limit=<n>` | Limite de sugestões (só `suggest`) | `10` |
| `--type=<cat>` | Filtra por categoria (`area`) ou tipo de símbolo (`find`) | - |
| `--area=<nome>` | Filtra por área (`context`, `find`) | - |
| `--def` | Mostra apenas definições (só `find`) | `false` |
| `--refs` | Mostra apenas referências/usos (só `find`) | `false` |
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

## Cache

Resultados são salvos em `.analyze/` para acelerar execuções futuras.

- Cache é invalidado automaticamente quando arquivos mudam
- Use `--no-cache` para forcar regeneração
- Adicione `.analyze/` ao `.gitignore`

## Requisitos

- Node.js >= 18.0.0
- Projeto TypeScript/JavaScript

## Créditos

- [Skott](https://github.com/antoine-coulon/skott) - Análise de dependências
- [Knip](https://knip.dev) - Detecção de código morto
- [ts-morph](https://ts-morph.com) - Análise AST

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
