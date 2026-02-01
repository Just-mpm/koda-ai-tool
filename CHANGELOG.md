# Changelog

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
