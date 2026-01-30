# Changelog

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
