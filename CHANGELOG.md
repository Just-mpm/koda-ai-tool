# Changelog

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
