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

### Busca de Simbolos
- **`find <termo>`** - Busca simbolos no codigo (definicao + usos)
- **`find <termo> --type=function|type|const|component|hook`** - Filtra por tipo
- **`find <termo> --area=<nome>`** - Busca apenas em uma area
- **`find <termo> --def`** - Mostra apenas definicoes
- **`find <termo> --refs`** - Mostra apenas referencias/usos

### Firebase Cloud Functions
- **`functions`** - Lista todas as Cloud Functions do projeto
- **`functions --trigger=onCall`** - Filtra por tipo de trigger
- **`find <nome> --type=trigger`** - Busca Cloud Functions especificas

### Areas Funcionais (Configuração Manual Obrigatória)
- **`areas`** - Lista todas as areas/dominios funcionais do projeto
- **`area <nome>`** - Mostra arquivos de uma area especifica (use ID ou Name)
- **`areas init`** - Gera template de configuracao de areas

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
- `aitool_area_context` - Contexto consolidado de toda uma area
- `aitool_find` - Busca simbolos no codigo: definicao + usos
- `aitool_list_functions` - Lista Cloud Functions Firebase

## Frameworks suportados

- Next.js (App Router e Pages Router)
- Vite (React, Vue)
- Create React App
- Remix
- Nuxt
- SvelteKit
- Astro
- Firebase Cloud Functions v2

## Stack interna

- [Skott](https://github.com/antoine-coulon/skott) - Analise de dependencias
- [Knip](https://knip.dev) - Deteccao de codigo morto
- [ts-morph](https://ts-morph.com) - Analise AST para extracoes
- [minimatch](https://github.com/isaacs/minimatch) - Pattern matching para areas

## Estrutura

```
src/
  commands/     # Comandos CLI (map, dead, impact, suggest, context, find, functions, areas, area)
  areas/        # Sistema de configuracao manual de areas
  mcp/          # Servidor MCP
  ts/           # Extrator TypeScript (ts-morph) + indexador de simbolos
  formatters/   # Formatadores text/json
  cache/        # Sistema de cache (graph, dead, symbols)
  utils/        # Utilitarios (detect, errors, firebase, similarity)
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
npx ai-tool areas init             # Gera configuracao inicial (TEMPLATE)
npx ai-tool area auth              # Arquivos da area "auth" (use ID)
npx ai-tool area "Autenticação"    # Tambem funciona (use Name)
npx ai-tool area auth --type=hook  # Apenas hooks da area "auth"
npx ai-tool area dashboard --full  # Todos os arquivos da area

# Firebase Cloud Functions
npx ai-tool functions                   # Lista todas as Cloud Functions
npx ai-tool functions --trigger=onCall  # Filtra por tipo de trigger
npx ai-tool find createUser --type=trigger  # Busca uma Cloud Function

# MCP
npx ai-tool --mcp                  # Servidor MCP
```

Opcoes: `--format=text|json`, `--cwd=<path>`, `--no-cache`, `--limit=<n>`, `--type=<categoria>`, `--full`, `--area=<nome>`, `--def`, `--refs`

## Configuracao de Areas

**IMPORTANTE**: A partir da versão 0.8.0, o sistema de areas usa **APENAS configuracao manual**.

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
      "patterns": ["app/meus-pets/**", "components/pets/**"],
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

### Boas Práticas

- Ideal: 5-15 áreas (muitas áreas é difícil de navegar)
- Use patterns para pastas: `"app/dashboard/**"`
- Use keywords para arquivos espalhados: `["auth", "login"]`
- Um arquivo pode pertencer a múltiplas áreas
- Use `exclude` para remover arquivos específicos de uma área

### Consultando Areas

Use **sempre o ID** para consultas mais rápidas:

```bash
# ID (recomendado)
ai-tool area areas-system
ai-tool area commands
ai-tool area utils

# Name (também funciona, com aspas se tiver espaço)
ai-tool area "Areas System"
ai-tool area "MCP Server"
```

O sistema resolve automaticamente:
1. ID exato: `areas-system`
2. Name amigável: `"Areas System"`
3. Match parcial: `area` → `areas-system`

## Sugestões Inteligentes

Quando usuário digita errado, o sistema sugere correções:

```bash
$ ai-tool area auht
❌ Área não encontrada: "auht"

💡 Você quis dizer?
   → ai-tool area auth
```

Funciona para arquivos e áreas.

## Firebase Cloud Functions

O ai-tool detecta automaticamente projetos Firebase e oferece suporte completo para Cloud Functions v2.

### Triggers Suportados (40+)

**HTTPS:**
- `onCall`, `onRequest`

**Firestore:**
- `onDocumentCreated`, `onDocumentCreatedWithAuthContext`
- `onDocumentUpdated`, `onDocumentUpdatedWithAuthContext`
- `onDocumentDeleted`, `onDocumentDeletedWithAuthContext`
- `onDocumentWritten`, `onDocumentWrittenWithAuthContext`

**Realtime Database:**
- `onValueCreated`, `onValueUpdated`, `onValueDeleted`, `onValueWritten`

**Scheduler:**
- `onSchedule`

**Storage:**
- `onObjectFinalized`, `onObjectArchived`, `onObjectDeleted`, `onMetadataUpdated`

**Pub/Sub:**
- `onMessagePublished`

**Identity/Auth:**
- `beforeUserCreated`, `beforeUserSignedIn`, `beforeEmailSent`, `beforeSmsSent`

**Alerts (Crashlytics, Performance, etc):**
- `onNewFatalIssuePublished`, `onNewNonfatalIssuePublished`, `onNewAnrIssuePublished`
- `onRegressionAlertPublished`, `onStabilityDigestPublished`, `onVelocityAlertPublished`
- `onThresholdAlertPublished`, `onPlanUpdatePublished`, `onPlanAutomatedUpdatePublished`

**Outros:**
- `onConfigUpdated` (Remote Config)
- `onCustomEventPublished` (Eventarc)
- `onTaskDispatched` (Tasks)
- `onTestMatrixCompleted` (Test Lab)

### Funcionalidades

1. **Deteccao automatica**: Projetos Firebase sao detectados por `.firebaserc` ou `firebase.json`
2. **Categoria cloud-function**: Arquivos em `functions/src/` sao categorizados automaticamente
3. **Alertas no map**: Mostra contagem de Cloud Functions quando detectadas
4. **Comando functions**: Lista todas as functions agrupadas por trigger
5. **Busca por trigger**: `find --type=trigger` busca apenas Cloud Functions
6. **Metadados**: Extrai path (Firestore) e schedule (cron) dos triggers
7. **Sugestoes inteligentes**: Sugere `firestore.rules` e `storage.rules` quando relevante
