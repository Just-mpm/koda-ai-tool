# Changelog

## [0.9.3] - 2026-02-06

### Improved
- **Busca enriquecida no comando `describe`**: Reescrita completa do algoritmo de busca
  - **Stopwords PT-BR/EN**: Filtra palavras comuns ("de", "da", "do", "para", "the", "of", etc.) da query antes de buscar. "Lista de alunos da turma" vira `["alunos", "turma"]`
  - **Score parcial**: Em vez de exigir 100% das palavras, calcula percentual. 2 de 3 palavras = score 0.33. Threshold: pelo menos 40% das palavras devem bater
  - **Keywords da config no searchableText**: O campo `keywords` das areas agora e incluido na busca. Se a area tem `keywords: ["login"]`, buscar por "login" encontra
  - **Nomes de arquivos reais**: Busca nos nomes dos arquivos da area (ex: `StudentList.tsx` e encontrado por "StudentList")
  - **Simbolos exportados**: Busca nos nomes de funcoes, tipos, componentes e hooks exportados (ex: `useAuth` encontra a area auth)
  - **Contagem real de arquivos**: `fileCount` agora reflete a quantidade real (antes era placeholder)

### Technical Details
- **Arquivo modificado**: `src/commands/describe.ts` - reescrita completa do algoritmo
- **Funcoes novas**: `removeStopwords()`, `calculatePartialScore()`, `buildAreaFileMap()`, `buildSearchableText()`
- **Funcoes removidas**: `calculateRelevanceScore()`, `getAreaFiles()` (substituidas)
- **Reutilizacao**: Usa `getAllCodeFiles()` de `src/ts/index.ts`, `detectFileAreas()` de `src/areas/detector.ts`, indice de simbolos com cache de `src/ts/cache.ts`
- **Testes**: 13 novos testes (6 para stopwords, 7 para score parcial). Total: 24 testes no describe

## [0.9.2] - 2026-02-06

### Fixed
- **Bug crítico: MCP tools falham quando `cwd` não é informado**
  - `indexProject()` agora aceita `cwd?: string` opcional
  - Usa `process.cwd()` como fallback quando `cwd` é `undefined`
  - Corrige erro "The 'path' argument must be of type string. Received undefined"
  - Todas as tools MCP agora funcionam sem passar parâmetro `cwd`

### Technical Details
- **Arquivo modificado**: `src/ts/cache.ts`
- **Função alterada**: `indexProject(cwd?: string)` - garante que `resolvedCwd` nunca é `undefined`

## [0.9.1] - 2026-02-05

### Fixed
- **Bug crítico: Comando `describe` não estava exposto no CLI**
  - Adicionado import de `describe.ts` no `cli.ts`
  - Adicionado case no switch para processar o comando
  - Atualizada documentação no HELP
  - Removido parâmetro `cache` (não existe em `DescribeOptions`)
  - CLI agora reconhece comando `describe`

### Added
- **Documentação completa**: Todos os arquivos de documentação atualizados (README, CHANGELOG, CLAUDE.md, AGENTS.md)
  - Documentação do comando `describe` no README
  - Novidades v0.9.0 documentadas no CLAUDE.md
  - Workflow atualizado no AGENTS.md
  - Package.json com descrição atualizada

### Technical Details
- **Arquivo modificado**: `src/cli.ts`
- **Arquivo modificado**: `package.json` (v0.9.0 → v0.9.1)
- **Arquivo modificado**: `CHANGELOG.md`
- **Arquivo modificado**: `README.md`
- **Arquivo modificado**: `CLAUDE.md`
- **Arquivo criado**: `docs/plan/melhorias-ai-tool.md`

## [0.9.0] - 2026-02-05

### Added
- **Busca por descrição** (`describe` command) - permite buscar áreas por keywords em linguagem natural com correções via Levenshtein
  - Ex: `npx ai-tool describe "autenticação"` → encontra área de autenticação
  - Correções automáticas: "autenticacao" → "autenticação"
  - Sugestões quando não encontra nada

- **Integração Git** - histórico de commits para análise de impacto
  - Comando `impact` agora mostra últimos commits do arquivo
  - Funções: `getCommitsForFile()`, `getBlameInfo()`, `hasGitRepo()`
  - Novo módulo: `src/integrations/git.ts`

- **Testes inteligentes** - sugestões de testes baseadas em arquivos afetados
  - Comando `suggest` agora inclui sugestões de testes
  - Detecta testes relacionados aos arquivos modificados
  - Sugere criar testes quando não existirem

### Changed
- **Refatoração crítica** - `src/mcp/server.ts` reduzido de 674 para 36 linhas (95% de redução)
  - Lógica MCP movida para `src/mcp/tools.ts` (557 linhas, bem organizado)
  - Registro de 13 ferramentas MCP separado em módulo dedicado

- **Type safety** - validação Zod para cache com migração automática
  - `schemaVersion=2.0.0` para detectar caches antigos
  - Caches invalidados automaticamente quando schema muda

- **Resultados expandidos**:
  - `SuggestResult.testSuggestions` - sugestões de testes (novo)
  - `ImpactResult.gitHistory` - histórico de commits Git (novo)

### Improved
- **Performance** - comandos mais rápidos com cache otimizado
- **Manutenibilidade** - código mais modular e organizado
- **UX** - sugestões mais inteligentes baseadas no tipo de arquivo (tipos críticos, serviços, etc)

### Technical Details
- **Novo arquivo**: `src/commands/describe.ts` (busca por descrição)
- **Novo arquivo**: `src/integrations/git.ts` (integração Git)
- **Novo arquivo**: `src/mcp/tools.ts` (registro de ferramentas MCP)
- **Arquivo reduzido**: `src/mcp/server.ts` (de 674 para 36 linhas)
- **Type adicionado**: `SuggestResult.testSuggestions`
- **Type adicionado**: `ImpactResult.gitHistory`
- **Type adicionado**: `CommitInfo`, `BlameInfo` (Git)
- **README atualizado**: documentação do comando `describe`

## [0.8.2] - 2025-02-05

### Melhorado

- **Documentação do servidor MCP**: Todas as tools agora têm descrições completas de parâmetros
  - `aitool_find`: Adicionada seção de parâmetros explicando `type`, `area`, `def`, `refs`. Incluído `"trigger"` no enum do `type` para buscar Cloud Functions
  - `aitool_list_functions`: Adicionada seção de parâmetros explicando `trigger` e `format`
  - `aitool_suggest_reads`: Adicionada seção de parâmetros explicando `limit` (com valores default e max)
  - `aitool_project_map`, `aitool_dead_code`, `aitool_impact_analysis`, `aitool_file_context`, `aitool_list_areas`, `aitool_area_detail`, `aitool_areas_init`, `aitool_area_context`: Todas com descrições melhoradas e seções de parâmetros
  - Cada tool agora explica claramente o que faz e quais parâmetros aceita, facilitando uso por agentes de IA

## [0.8.1] - 2025-02-04

### Corrigido

- **Bug crítico: Cache não atualiza corretamente**: Substituído hash XOR por soma aditiva para evitar colisões
  - XOR causava colisões quando múltiplos arquivos mudavam (ex: 2 arquivos [1000, 2000] e 3 arquivos [500, 1228, 0] tinham mesmo XOR)
  - Soma elimina colisões práticas e garante que cache seja invalidado corretamente
  - Adicionado indicador de existência do `areas.config.json` no hash para detectar criação/remoção

- **Bug: Ignore do areas.config não respeitado pelo Knip**: Comando `dead` agora gera config temporária do Knip baseada nos padrões `ignore`
  - Antes: `ai-tool dead` executava Knip sem passar os ignores do `areas.config.json`
  - Agora: Gera arquivo `.knip.ai-tool.json` temporário com os padrões de ignore
  - Arquivo temporário é removido automaticamente após execução
  - Resolve falsos positivos de código morto em arquivos ignorados

### Adicionado

- **Entradas no .gitignore**: `knip.json` e `.knip.ai-tool.json` para evitar commit de configs temporárias

## [0.8.0] - 2025-02-03

### Mudanças Importantes

- **Sistema de áreas agora usa APENAS configuração manual**: Removida detecção automática de áreas
  - `autoDetect: false` agora é o default (antes era `true`)
  - Comando `areas init` gera template de configuração baseado no framework detectado
  - Remove ~600 linhas de código (arquivo `patterns.ts` com patterns hardcoded)
  - Configuração manual é obrigatória e mais transparente

### Removido

- **Detecção automática de áreas**: Removido arquivo `src/areas/patterns.ts` (441 linhas)
  - Removidos patterns hardcoded para frameworks (Next.js, Vite, Remix, etc)
  - Removidas constantes `FOLDER_PATTERNS`, `KEYWORD_PATTERNS`, `AREA_NAMES`, `AREA_DESCRIPTIONS`
  - Removida lógica de `autoDetect` do `detector.ts` (agora usa apenas config manual)

### Alterado

- **`DEFAULT_CONFIG`**: `autoDetect` alterado de `true` para `false`
- **`detector.ts`**: Simplificado para usar APENAS configuração manual
  - Mantida função `inferFileDescription` para inferir descrições de arquivos
  - Mantidas funções `getAreaName` e `getAreaDescription` (usam config)
- **`areas init`**: Gera template robusto baseado no framework detectado
  - Next.js (App Router e Pages Router): template com auth, dashboard, shared-ui, api
  - Vite/CRA: template com auth, dashboard, shared-ui
  - Genérico: template mínimo com auth e shared-ui

### Corrigido

- **Resolução de nomes de áreas**: Sistema aceita tanto ID quanto Name
  - ID: `ai-tool area auth`
  - Name: `ai-tool area "Autenticação"`
  - Match parcial: `ai-tool area area` → resolve para `areas-system`

### Adicionado

- **Mensagem de erro clara**: Quando projeto não tem áreas configuradas
  - Mostra "X arquivo(s) sem área definida"
  - Sugere usar `areas init` para configurar
- **Dicas de uso no README**: Como consultar áreas por ID ou Name

### Benefícios

✅ **Simplicidade** - 600 linhas a menos de código para manter
✅ **Transparência** - Usuário vê exatamente o que está configurado
✅ **Controle** - Domínios específicos funcionam perfeitamente
✅ **Manutenibilidade** - Sem patterns genéricos para atualizar

## [0.7.10] - 2025-02-03

### Adicionado

- **Melhorias na detecção de áreas**: Sistema de áreas agora detecta automaticamente mais padrões de organização

### Corrigido

- **Pequenas correções de bug e ajustes de performance**

## [0.7.7] - 2025-02-03

### Adicionado

- **Logs de debug ultra-detalhados para diagnóstico de Cloud Functions**:
  - Mostra todos os imports detectados por arquivo em functions/src/
  - Para cada CallExpression, mostra variável, código (primeiros 100 chars), imports
  - Em `extractFirebaseTriggerName`, mostra Node Kind, Expression Kind, se é Identifier/PropertyAccess
  - Em PropertyAccess, mostra profundidade da chain e nome da raiz
  - No comando `functions`, mostra estatísticas completas de indexação quando `DEBUG_FUNCTIONS=true`
  - Ajuda a identificar exatamente onde a detecção de triggers está falhando

## [0.7.6] - 2025-02-03

### Adicionado

- **Arquivo de documentação DEBUG_FUNCTIONS.md**: Guia para debug de Cloud Functions
  - Lista possíveis causas quando triggers não são detectadas
  - Instruções para habilitar debug: `DEBUG_FUNCTIONS=true ai-tool functions`
  - Exemplo de teste manual com arquivo simples

## [0.7.5] - 2025-02-03

### Corrigido

- **Problema com tsconfig.json de projetos Firebase**:
  - Projetos com `tsconfig.json` usando `"files": []` + project references (Vite, Next.js) não carregavam arquivos
  - Adicionados logs detalhados de quantos arquivos foram encontrados vs adicionados ao projeto
  - Logs mostram especificamente quantos arquivos `functions/src/` estão no projeto ts-morph
  - Isso ajuda a diagnosticar quando o parser não consegue ler os sources

### Adicionado

- **Diagnósticos de indexação em DEBUG mode**:
  - `[indexer] Total de arquivos encontrados: N`
  - `[indexer] Arquivos adicionados ao projeto: N`
  - `[indexer] Arquivos com erro: N`
  - `[indexer] SourceFiles no projeto: N`
  - `[indexer] Arquivos functions/src/ no projeto: N`

## [0.7.4] - 2025-02-03

### Adicionado

- **Diagnósticos avançados para debug de Cloud Functions**:
  - Logs detalhados do tipo de nó AST para cada variável em functions/src/
  - Mostra se é CallExpression, ArrowFunction, FunctionExpression, etc
  - Regex de detecção agora suporta type parameters multiline (`[\s\S]*?`)
  - Debug mostra teste de cada trigger individualmente
  - Exemplo: `DEBUG_FUNCTIONS=true ai-tool functions`

## [0.7.3] - 2025-02-02

### Adicionado

- **Diagnósticos detalhados para Cloud Functions**:
  - Nova variável de ambiente `DEBUG_FUNCTIONS=true` para debug específico de functions
  - Logs detalhados mostram: arquivos encontrados, símbolos analisados, triggers detectados
  - Quando não encontra funções, mostra estatísticas completas de indexação
  - Exemplo: `DEBUG_FUNCTIONS=true ai-tool functions`

### Corrigido

## [0.7.2] - 2025-02-02

### Corrigido

- **Bug crítico: Cloud Functions não detectadas**:
  - Adicionadas pastas de output compilado ao `IGNORED_DIRS`: `functions/lib`, `lib`, `.output`, `out`, `.firebase`
  - Agora o indexador processa apenas arquivos TypeScript fonte em `functions/src/`, ignorando JavaScript compilado
  - Isso resolve o problema onde 31 Cloud Functions existentes não apareciam no comando `functions`

- **Bug de resolução de caminho com `index.ts`**:
  - Reescrita lógica de matching em `suggest` e `impact` com sistema de prioridades
  - Prioridade 1: Match exato de path completo
  - Prioridade 2: Mesmo nome + diretório contém path do target
  - Prioridade 3: Path do target contém diretório do arquivo
  - Prioridade 4-6: Matches parciais e flexíveis
  - Resolve problema onde `src/services/quota/index.ts` era confundido com `src/pages/LandingPages/index.ts`

- **Timeout no comando `map` em projetos grandes**:
  - Otimização do `calculateFilesHash` com limite de profundidade (`MAX_DEPTH = 6`)
  - Substituição de soma por XOR para combinar hashes (mais rápido)
  - Hash composto: `contagem + acumulador XOR + timestamp máximo`
  - Uso de Set para extensões (lookup O(1))
  - Ignora automaticamente arquivos ocultos (`.*`)

- **Path normalization para Windows**:
  - Adicionado `resolve()` no CLI para normalizar paths com forward slashes
  - Resolve problema onde `--cwd="D:/caminho"` não funcionava no Windows

## [0.7.1] - 2025-02-02

### Corrigido

- **Bug: Cloud Functions não detectadas**: Melhorada detecção de triggers Firebase v2
  - Regex aprimorada para capturar type parameters: `onCall<Request>()`
  - Adicionado suporte a mais padrões de namespace
  - Debug mode: `DEBUG_ANALYZE=true ai-tool functions` mostra logs detalhados

### Adicionado

- **Melhorias UX - Comando DEAD**:
  - Nova seção "COMO RESOLVER" com 3 opções claras no final do output
  - Sugestões inteligentes de padrões para ignore:
    - Detecta automaticamente `functions/lib/**` (build Firebase)
    - Detecta arquivos de teste (`**/*.test.ts`)
    - Detecta arquivos `.d.ts`, configurações e scripts
  - Cada sugestão mostra: ícone, padrão, motivo e quantidade de arquivos

- **Melhorias UX - Comando AREA**:
  - Suporte a busca por nome amigável: `ai-tool area Autenticação` → encontra "auth"
  - Normalização de acentos e case-insensitive
  - Mensagem informativa quando converte o nome: "💡 Buscando área 'Autenticação' (ID: auth)"

- **Melhorias UX - Comando FUNCTIONS**:
  - Feedback detalhado quando não detecta functions:
    - Lista 5 possíveis causas com soluções
    - Mostra padrões suportados
    - Sugere `--no-cache` e `DEBUG_ANALYZE=true`
  - Quando detecta, mostra dica de filtros disponíveis

- **Melhorias UX - Comando FIND**:
  - Permite listar todos de um tipo sem query: `ai-tool find --type=trigger --def`
  - Modo listAll otimizado (ignora busca de imports)
  - Mensagem informativa: "📋 Listando todos os símbolos do tipo: trigger"

- **Melhorias UX - Comando AREAS INIT**:
  - Detecta e sugere padrões para ignore automaticamente
  - Mostra no output quantos padrões de ignore foram adicionados
  - Configuração mais inteligente baseada na estrutura do projeto

## [0.7.0] - 2025-02-02

### Adicionado

- **Suporte completo a Firebase Cloud Functions v2**: Deteccao automatica de 40+ triggers
  - `onCall`, `onRequest` (HTTPS)
  - `onDocumentCreated`, `onDocumentUpdated`, `onDocumentDeleted`, `onDocumentWritten` (Firestore)
  - `onValueCreated`, `onValueUpdated`, `onValueDeleted`, `onValueWritten` (Realtime Database)
  - `onSchedule` (Scheduler)
  - `onObjectFinalized`, `onObjectArchived`, `onObjectDeleted`, `onMetadataUpdated` (Storage)
  - `onMessagePublished` (Pub/Sub)
  - `beforeUserCreated`, `beforeUserSignedIn` (Identity)
  - Crashlytics, Performance, App Distribution, Test Lab alerts
  - `onConfigUpdated`, `onCustomEventPublished`, `onTaskDispatched`, `onTestMatrixCompleted`

- **Comando `functions`**: Lista todas as Cloud Functions do projeto
  - Agrupa por tipo de trigger
  - Mostra metadados (path para Firestore, schedule para cron)
  - Filtra por trigger: `ai-tool functions --trigger=onCall`

- **Tipo de simbolo `trigger`**: Busca Cloud Functions com o comando `find`
  - `ai-tool find createUser --type=trigger` - busca apenas triggers
  - `ai-tool find createUser --type=function` - inclui triggers + funcoes normais

- **Categoria `cloud-function`**: Arquivos em `functions/src/` sao categorizados automaticamente

- **Alerta Firebase no `map`**: Mostra contagem de Cloud Functions quando projeto Firebase e detectado

- **Sugestoes inteligentes para Cloud Functions**: Comando `suggest` agora sugere:
  - `firestore.rules` quando target e trigger Firestore
  - `storage.rules` quando target e trigger Storage
  - `functions/src/index.ts` para Cloud Functions

- **Triggers no `context --area`**: Area context agora inclui Cloud Functions com metadados

- **Tool MCP `aitool_list_functions`**: Lista Cloud Functions via servidor MCP

### Alterado

- **indexer.ts**: Detecta CallExpressions para identificar triggers Firebase
- **find.ts**: `--type=function` agora inclui triggers (comportamento mais intuitivo)
- **formatters/text.ts**: Adicionada categoria `cloud-function` em todas as listas

### Tipos

- `TriggerInfo`: Metadados de trigger (type, path, schedule)
- `AreaContextTriggerInfo`: Trigger info para area context
- `CloudFunctionInfo`, `FunctionsResult`, `FunctionsOptions`: Tipos do comando functions

## [0.6.1] - 2025-02-02

### Corrigido

- **Bug crítico no comando `find`**: Corrigido erro "Cannot read properties of undefined (reading 'escapedName')"
  - Causa: ts-morph falhava ao resolver tipos de dependências externas ou caminhos de import quebrados
  - Solução: Adicionado tratamento defensivo com try-catch em 4 pontos críticos do `indexer.ts`
  - Funções afetadas: `getReturnType()`, `getType()` em funções, type aliases e propriedades de interface
  - Agora retorna `"unknown"` para tipos não resolvidos em vez de crashar

## [0.6.0] - 2025-02-02

### Adicionado

- **Comando `find`**: Busca simbolos no codigo (funcoes, tipos, componentes, hooks, constantes)
  - Retorna definicao + referencias/usos
  - Diferente de grep: entende o AST do TypeScript
  - Filtros: `--type=function|type|const|component|hook`, `--area=<nome>`, `--def`, `--refs`
  - Exemplos: `ai-tool find useAuth`, `ai-tool find User --type=type`, `ai-tool find login --area=auth`

- **Comando `context --area=<nome>`**: Contexto consolidado de toda uma area
  - Uma chamada = entender toda a feature (tipos, hooks, funcoes, componentes, services, stores)
  - Muito mais eficiente que chamar `context` em cada arquivo individualmente
  - Exemplo: `ai-tool context --area=auth`

- **Sistema de cache para simbolos**: Indexa todos os simbolos do projeto com cache
  - Cache salvo em `.analyze/symbols.json`
  - Invalidacao automatica quando arquivos mudam
  - Performance: ~43% mais rapido em projetos pequenos, ~85-90% em projetos grandes (500-1000 arquivos)

- **Tools MCP**:
  - `aitool_find` - Busca simbolos no codigo
  - `aitool_area_context` - Contexto consolidado de uma area

- **Novo modulo `src/ts/indexer.ts`**: Sistema de indexacao de simbolos
  - `indexProject(cwd)` - Indexa todos os arquivos do projeto
  - `ProjectIndex` - Estrutura com `symbolsByName` para busca rapida

### Alterado

- **Funcao `context`** agora usa o indice de simbolos cacheado quando disponivel
- **Cache** agora inclui `symbols.json` alem de `meta.json`, `graph.json`, `dead.json`

## [0.5.5] - 2025-02-02

### Corrigido

- **Invalidação de cache ao editar `areas.config.json`**: Corrigido bug onde edições na configuração de áreas não invalidavam o cache do `map`
  - Antes: `areas.config.json` estava na pasta `.analyze` que é ignorada pelo hash
  - Agora: o arquivo de configuração é verificado explicitamente no cálculo do hash
  - Resultado: o comando `map` agora reflete mudanças nas áreas imediatamente

## [0.5.4] - 2025-02-01

### Adicionado

- **Sugestões inteligentes "Você quis dizer?"**: Quando usuário digita errado, o sistema sugere a opção correta
  - Usa algoritmo de Levenshtein para detectar typos (ex: `auht` → `auth`)
  - Funciona para arquivos e áreas
  - Considera tanto áreas manuais quanto automáticas

- **Referência rápida de comandos**: Mensagens de erro agora incluem lista de comandos disponíveis
  - Ajuda usuários a descobrir comandos úteis quando algo dá errado

- **Novo módulo `src/utils/similarity.ts`**: Funções de similaridade de strings
  - `levenshteinDistance(a, b)` - Calcula distância entre strings
  - `findSimilar(target, candidates, options)` - Encontra itens similares
  - `findBestMatch(target, candidates)` - Retorna melhor match para "você quis dizer?"
  - `extractFileName(path)` - Extrai nome do arquivo sem extensão

- **Novo módulo `src/utils/errors.ts`**: Formatadores de erro padronizados
  - `formatFileNotFound()` - Erro de arquivo não encontrado com sugestões
  - `formatAreaNotFound()` - Erro de área não encontrada com sugestões
  - `formatMissingTarget()` - Erro de target obrigatório com exemplos
  - `formatInvalidCommand()` - Erro de comando inválido com lista de comandos
  - `COMMAND_REFERENCE` - Dicionário de comandos disponíveis

### Alterado

- **Código DRY**: Removido código duplicado de Levenshtein de 3 arquivos
  - `impact.ts`, `suggest.ts`, `context.ts` agora usam módulo compartilhado
  - Redução de ~180 linhas duplicadas para ~60 linhas centralizadas

- **Mensagens de erro consistentes**: Todos os erros seguem o mesmo formato com emojis
  - ❌ Erro principal
  - 💡 Você quis dizer?
  - 📝 Arquivos/áreas similares
  - 📖 Dicas
  - 📌 Comandos úteis

### Exemplo

```bash
$ ai-tool suggest errrs
❌ Arquivo não encontrado: "errrs"

💡 Você quis dizer?
   → src/utils/errors.ts

📌 Comandos úteis:
   ai-tool map        Resumo do projeto
   ai-tool areas      Listar áreas
   ...
```

## [0.5.2] - 2025-02-01

### Adicionado

- **Suporte a `ignore` no `areas.config.json`**: Permite ignorar arquivos/pastas globalmente em todos os comandos de áreas
  - Usa padrões glob (minimatch): `"ignore": ["docs/brainstorming/**", "functions/lib/**"]`
  - Arquivos ignorados não aparecem nos resultados de `map`, `areas` e `area`
  - Útil para excluir protótipos, código compilado, ou diretórios irrelevantes

### Alterado

- Comandos `map`, `areas` e `area` agora filtram arquivos baseado no campo `ignore` da configuração
- Função `isFileIgnored` exportada do `areas/detector.ts` para uso externo
- Função `getIgnorePatterns` adicionada ao `areas/config.ts`

## [0.5.1] - 2025-02-01

### Corrigido

- **`autoDetect: false` agora funciona corretamente**: Quando desabilitado no `areas.config.json`, apenas áreas definidas manualmente são usadas
  - Antes: padrões automáticos eram sempre aplicados, ignorando a configuração
  - Agora: respeita `settings.autoDetect: false` e usa APENAS a configuração manual

### Alterado

- **Padrões automáticos agora são genéricos**: Removidos todos os padrões específicos de domínio
  - Removido: `meus-pets`, `consultas-ia`, `health-tracking`, `training`, `veterinary`, etc
  - Renomeado: `stripe` → `billing` (mais genérico)
  - Mantido: apenas termos técnicos universais (auth, dashboard, billing, checkout, etc)
- **Descrições genéricas**: Removidas descrições específicas como "consultas veterinárias"
- **Keywords simplificadas**: Apenas keywords que fazem sentido em qualquer projeto

### Recomendação

Para projetos com domínios específicos, use `autoDetect: false` no `areas.config.json` e defina suas áreas manualmente.

## [0.5.0] - 2025-01-31

### Mudancas Importantes

- **`map` agora retorna resumo compacto por padrao**: Otimizado para uso com LLMs, reduzindo de ~30k tokens para ~200 tokens
  - Mostra: contagens por categoria, areas detectadas, alertas (deps circulares, arquivos sem area)
  - Inclui dicas de proximos passos guiando uso das outras tools
  - Use `--full` para obter a lista completa de arquivos (comportamento antigo)

- **Descricoes das tools MCP reduzidas em 92%**: De ~200 linhas para ~16 linhas total
  - Cada tool agora tem 2 linhas de descricao concisa
  - Modelos entendem melhor e usam menos tokens

### Adicionado

- Nova funcao `formatMapSummary` para output compacto
- Parametro `--full` no comando `map` para lista completa
- Integracao de areas no output do `map` (mostra nomes das areas detectadas)
- Dicas contextuais no resumo:
  - Alerta de dependencias circulares com sugestao de usar `impact`
  - Alerta de arquivos sem area com sugestao de usar `areas init`

### Alterado

- MCP `aitool_project_map` sempre usa resumo (nao tem opcao full)
- CLI `ai-tool map` usa resumo por padrao, `--full` para lista completa

## [0.4.1] - 2025-01-31

### Corrigido

- **Tools MCP de Areas**: Corrigido bug onde as 3 tools de areas nao estavam sendo expostas no servidor MCP
  - `aitool_list_areas` - Agora disponivel
  - `aitool_area_detail` - Agora disponivel
  - `aitool_areas_init` - Agora disponivel
- Build agora inclui corretamente todas as 8 tools MCP

## [0.4.0] - 2025-01-31

### Adicionado

- **Sistema de Areas/Dominios Funcionais**: Nova feature principal para navegar projetos por dominio funcional
  - `ai-tool areas` - Lista todas as areas detectadas automaticamente
  - `ai-tool area <nome>` - Mostra arquivos de uma area especifica
  - `ai-tool area <nome> --type=hook` - Filtra por categoria
  - `ai-tool area <nome> --full` - Mostra todos os arquivos
  - `ai-tool areas init` - Gera arquivo de configuracao `.analyze/areas.config.json`

- **Arquivo de configuracao editavel**: `.analyze/areas.config.json`
  - Permite definir areas customizadas com patterns glob
  - Keywords para deteccao por nome de arquivo
  - Descricoes manuais para arquivos especificos
  - Merge de deteccao automatica + configuracao manual

- **Suporte multi-framework**: Deteccao de categorias e areas para:
  - Next.js (App Router e Pages Router)
  - Vite (React, Vue)
  - Create React App
  - Remix
  - Nuxt
  - SvelteKit
  - Astro

- **Tools MCP**:
  - `aitool_list_areas` - Lista areas do projeto
  - `aitool_area_detail` - Detalhe de uma area especifica
  - `aitool_areas_init` - Gera arquivo de configuracao de areas

### Dependencias

- Adicionado `minimatch@^10.0.1` (pattern matching para areas)

## [0.3.2] - 2025-01-30

### Corrigido

- **Falsos positivos em Firebase Cloud Functions**: O comando `dead` agora detecta automaticamente projetos Firebase (via `.firebaserc` ou `firebase.json`) e filtra arquivos em `functions/src/` que estao exportados no `index.ts`
  - Resolve o problema de Cloud Functions serem marcadas como "orfas" pelo Knip
  - Detecta padroes: `export { foo } from "./foo"`, `export * from "./foo"`, imports com re-export
  - Mostra no output quantos arquivos foram filtrados

### Adicionado

- Novo utilitario `src/utils/firebase.ts` com funcoes:
  - `isFirebaseProject(cwd)` - Detecta projeto Firebase
  - `hasFirebaseFunctions(cwd)` - Detecta Cloud Functions
  - `isExportedCloudFunction(file, cwd)` - Verifica se arquivo esta exportado
  - `filterCloudFunctionsFalsePositives(files, cwd)` - Filtra falsos positivos
- Campo `filters` no resultado do `dead` com metadata sobre filtros aplicados
- Cache do conteudo do `index.ts` para performance

## [0.3.1] - 2025-01-30

### Adicionado

- **Comando `suggest`**: Sugere arquivos para ler ANTES de modificar um arquivo
  - Prioriza: tipos (critical) > dependencias diretas (high) > upstream (medium) > testes (low)
  - Suporta busca por nome parcial ou caminho completo
  - `ai-tool suggest Button --limit=5`

- **Comando `context`**: Extrai assinaturas de funcoes e tipos sem implementacao
  - Usa `ts-morph` para analise AST precisa
  - Retorna: imports, exports, funcoes (com params/retorno), types/interfaces/enums
  - Ideal para entender a API publica de um arquivo rapidamente
  - `ai-tool context src/hooks/useAuth.ts`

- **Servidor MCP**: Integracao com Claude Desktop e outras ferramentas MCP
  - `ai-tool --mcp` inicia servidor via stdio
  - Tools expostas: `aitool_project_map`, `aitool_dead_code`, `aitool_impact_analysis`, `aitool_suggest_reads`, `aitool_file_context`
  - Usa `@modelcontextprotocol/sdk` para comunicacao JSON-RPC

### Dependencias

- Adicionado `@modelcontextprotocol/sdk@^1.25.3`
- Adicionado `ts-morph@^27.0.2` (analise AST)
- Adicionado `zod@^3.25.76` (validacao de schemas MCP)

## [0.2.0] - 2025-01-XX

### Adicionado

- Comando `map` - Mapa completo do projeto com categorizacao
- Comando `dead` - Deteccao de codigo morto (usa Knip)
- Comando `dead --fix` - Remocao automatica de codigo morto
- Comando `impact` - Analise de impacto antes de modificar
- Sistema de cache em `.analyze/` para acelerar execucoes
- Suporte a formatos `text` e `json`

## [0.1.0] - 2025-01-XX

### Adicionado

- Versao inicial com integracao Skott + Knip
