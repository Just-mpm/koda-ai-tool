# Plano: Melhorias do ai-tool MCP

## Contexto

Análise profunda do pacote npm `@justmpm/ai-tool` (versão 0.8.2) realizada usando o próprio MCP. O projeto é uma ferramenta de análise de dependências e código para projetos TypeScript/JavaScript, exposta como servidor MCP para uso por IAs assistentes de código.

### Stack Atual
- **Core**: TypeScript 5.8.3, Node.js >=18
- **Dependencies**: Skott (grafo), Knip (código morto), ts-morph (AST), Zod (validação)
- **MCP**: @modelcontextprotocol/sdk v1.25.3
- **Build**: tsup, typecheck com tsc

### Estrutura do Projeto
- 26 arquivos | 9 pastas
- 9 áreas funcionais: Commands, Areas System, Cache, Utils, TypeScript Analysis, MCP Server, Formatters, Types, CLI
- Sistema de cache inteligente em `.analyze/`

## Decisões Tomadas

### 1. Escopo: Equilibrado (Refatoração + Novas Funcionalidades)

Abordagem definida: **Opção B** - Fase 1: refatoração crítica; Fases 2-3: novas funcionalidades.

**Racional:**
- Refatoração elimina ~250 linhas duplicadas, criando base sólida
- Novas features trazem valor visível para usuários
- Equilibre dívida técnica (reduz) com inovação (adiciona)

### 2. Busca por Descrição: Híbrida (Palavras-chave + Similaridade)

Abordagem definida: **Opção C** - Busca híbrida usando código existente.

**Racional:**
- `src/utils/similarity.ts` já implementa Levenshtein
- Zero custo adicional, usa recursos atuais
- Rápido de implementar, entrega valor imediato
- Futuramente pode evoluir para embeddings (local ou API) se uso for alto

### 3. Divisão de Arquivos Longos: Durante Refatoração

Abordagem definida: **Opção A** - Dividir durante Fase 1.

**Racional:**
- Refatoração já mexe nestes arquivos
- Divisão incremental reduz risco
- Arquitetura mais limpa facilita próximas features

**Arquivos a dividir:**
- `src/ts/indexer.ts` (969 → ~300 linhas)
- `src/mcp/server.ts` (674 → ~200 linhas + módulos de tools)

## Reutilização e Padrões

### Código Existente que Deve Ser Reutilizado

#### 1. Sistema de Cache Inteligente
**Localização:** `src/cache/index.ts`
**Como usar:**
```typescript
// Padrão atual em todos os comandos
if (useCache && isCacheValid(cwd)) {
  const cached = getCachedXxx<T>(cwd);
  if (cached) return formatXxx(cached);
}
// ... executar e salvar
if (useCache) cacheXxx(cwd, result);
```

#### 2. Tratamento de Erros com Sugestões
**Localização:** `src/utils/errors.ts`
**Padrão:**
```typescript
import { formatFileNotFound } from "../utils/errors.js";

return formatFileNotFound({ target, allFiles, command: "impact" });
// Saída: "❌ Arquivo não encontrado: 'Btn'\n\n💡 Você quis dizer?\n   → ai-tool impact Button"
```

#### 3. Configuração de Áreas
**Localização:** `src/areas/`
**Como usar:**
```typescript
import { readConfig, detectFileAreas } from "../areas/config.js";
import { getAreaName } from "../areas/detector.js";

const config = readConfig(cwd);
const areas = detectFileAreas(filePath, config);
const name = getAreaName(areaId, config);
```

### Padrões Seguidos

#### 1. Comandos MCP: Descrições Consistentes
**Padrão em:** `src/mcp/server.ts`
```typescript
description: `Mapeia projeto e retorna resumo: contagens, areas, alertas.
Use no inicio da sessao. Para detalhes: area_detail, file_context.

Parametros:
- format: text (legivel) ou json (estruturado)
- cwd: Diretorio do projeto`
```

**Benefício:** IAs entendem quando usar cada ferramenta

#### 2. Formatação de Saída: Headers ASCII Art
**Padrão em:** `src/formatters/text.ts`
```typescript
out += `╔══════════════════════════════════════════════════════════════╗\n`;
out += `║                    📦 PROJECT MAP                         ║\n`;
out += `╚══════════════════════════════════════════════════════════════╝\n\n`;
```

**Oportunidade:** Criar helper `generateHeader(title, icon)` para padronizar

### Código Novo (Justificativa)

#### 1. `src/utils/file-matcher.ts` (NOVO)
**Por que não existe:** Lógica de `findTargetFile` está duplicada em 3 arquivos
**Função:** Unificar lógica de matching de arquivos por prioridade
**Impacto:** Remove ~200 linhas duplicadas

#### 2. `src/ts/utils.ts` (NOVO)
**Por que não existe:** `simplifyType` e `formatInterfaceDefinition` duplicados
**Função:** Funções compartilhadas para TypeScript AST
**Impacto:** Remove ~50 linhas duplicadas

#### 3. `src/commands/base.ts` (NOVO)
**Por que não existe:** Parsing de opções, criação de resultados e formatação duplicados em todos comandos
**Função:** Helpers compartilhados `parseCommandOptions()`, `createCommandResult()`, `formatOutput()`
**Impacto:** Remove ~100 linhas duplicadas

#### 4. `src/commands/describe.ts` (NOVO - Fase 3)
**Por que não existe:** Busca atual é por nome, não por descrição em linguagem natural
**Função:** Busca por descrição usando keywords + Levenshtein (já existe em `src/utils/similarity.ts`)
**Impacto:** Permite buscas como "Onde implementou login?" sem custo de embeddings

#### 5. `src/integrations/git.ts` (NOVO - Fase 3)
**Por que não existe:** Contexto temporal de mudanças não disponível
**Função:** Integração com Git para histórico de commits
**Impacto:** IAs podem entender contexto temporal antes de modificar

## Arquivos a Modificar

### FASE 1: Refatoração Crítica

#### 1. Criar `src/utils/file-matcher.ts` (NOVO)
- Extrair `findTargetFile` de `impact.ts:263-332`
- Extrair `findTargetFile` de `suggest.ts:257-326`
- **NOTA: Testes serão criados na FASE 4 separada**

#### 2. Criar `src/ts/utils.ts` (NOVO)
- Extrair `simplifyType` de `extractor.ts:106-116`
- Extrair `simplifyType` de `indexer.ts:899-906`
- Extrair `formatInterfaceDefinition` de `extractor.ts:227-255`
- Extrair `formatInterfaceDefinition` de `indexer.ts:946-968`

#### 3. Atualizar comandos para usar novo `file-matcher.ts`
- `src/commands/impact.ts` - remover função duplicada, importar de utils
- `src/commands/suggest.ts` - remover função duplicada, importar de utils

#### 4. Atualizar TypeScript utils
- `src/ts/extractor.ts` - importar de `utils.ts`
- `src/ts/indexer.ts` - importar de `utils.ts`

#### 5. Criar `src/commands/base.ts` (NOVO)
- Adicionar `parseCommandOptions<T>()` - parsing padrão de cwd, format, cache
- Adicionar `formatOutput()` - formatação padrão (if json → JSON.stringify, else → formatter)
- **NOTA: Não criar `createCommandResult<T>()` genérico** - cada comando cria seu resultado específico
- Adicionar JSDoc para documentar o módulo

#### 6. Atualizar todos os comandos para usar `base.ts`
- `src/commands/map.ts` - usar `parseCommandOptions`, `formatOutput`
- `src/commands/dead.ts` - usar `parseCommandOptions`, `formatOutput`
- `src/commands/impact.ts` - usar `parseCommandOptions`, `formatOutput`
- `src/commands/suggest.ts` - usar `parseCommandOptions`, `formatOutput`
- `src/commands/context.ts` - usar `parseCommandOptions`, `formatOutput`
- `src/commands/find.ts` - usar `parseCommandOptions`, `formatOutput`

### FASE 2: Arquitetura e Type Safety

#### 7. Dividir `src/ts/indexer.ts` (969 linhas)
```
src/ts/
  ├── index.ts              # Indexação principal (~200 linhas)
  ├── extractor.ts          # Extração de símbolos (já existe, ~317 linhas)
  ├── utils.ts              # Funções compartilhadas (criado na Fase 1)
  ├── triggers.ts           # Detecção de triggers Firebase (~200 linhas)
  └── cache.ts              # Cache de símbolos (mover cache lógica, ~150 linhas)
```

#### 8. Extrair debug logging
- Criar `src/utils/logger.ts`
- Mover debug code de `indexer.ts:82-106`
- Substituir `console.error` por `logger.debug()`

#### 9. Adicionar validação Zod para cache com migração
- Criar `src/cache/schemas.ts`
- Adicionar schemas para `MapResult`, `DeadResult`, `ProjectIndex`
- Atualizar `readCache` para validar
 - **MIGRAÇÃO**: Invalidar caches existentes detectando formato antigo (sem `schemaVersion` no meta.json)
    - Implementar: `if (!meta.schemaVersion || meta.schemaVersion < MIN_SCHEMA_VERSION) return false;`

10. **Verificação Fase 2**
     - `npm run typecheck`
     - `npm run build`
     - Testar MCP server
     - Verificar que `indexer.ts` tem <300 linhas

### FASE 3: Novas Funcionalidades (Estimado: 1-2 semanas)

11. **Busca por descrição (Híbrida)**
    - Criar `src/commands/describe.ts`
    - Implementar busca por keywords em descrições de áreas
    - Integrar com `src/utils/similarity.ts` (Levenshtein) para correções
    - **NOTA: Testes serão criados na FASE 4 separada**
    - Expor no MCP server como `aitool_describe`
    - Documentar no README

12. **Integração Git**
    - Criar `src/integrations/git.ts`
    - Implementar `getCommitsForFile`, `getBlameInfo`
    - **NOTA: Testes serão criados na FASE 4 separada** (mock git)
    - Integrar com `impact.ts` (mostrar histórico de arquivos afetados)

13. **Testes inteligentes**
    - Extender `suggest.ts`
    - Adicionar lógica de sugestão de testes
    - Testar em projeto real

14. **Dividir `src/mcp/server.ts` (674 linhas)**
    - Estrutura proposta:
      ```
      src/mcp/
        ├── server.ts             # Setup e start do servidor (~100 linhas)
        ├── tools.ts              # Registro de todas as tools (~150 linhas)
        └── validators/
            └── schemas.ts        # Schemas Zod para validação de inputs (~100 linhas)
      ```
    - Criar `src/mcp/tools.ts` - mover registro de cada tool
    - Criar `src/mcp/validators/schemas.ts` - mover schemas Zod
    - Atualizar imports
    - Adicionar JSDoc para novos módulos

15. **Verificação Fase 3**
    - `npm run typecheck`
    - Testar MCP server localmente
    - Testar novas funcionalidades
    - Atualizar README

16. **Release**
    - Atualizar `package.json` para v0.9.0
    - Criar CHANGELOG.md
    - `npm publish`

## Verificação

### Testes Automáticos (FASE 1-3)
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run build` compila sem warnings

### Testes Manuais (FASE 1-3)
- [ ] `npx ai-tool map` funciona
- [ ] `npx ai-tool find useAuth` funciona
- [ ] `npx ai-tool impact Button` funciona
- [ ] `npx ai-tool dead` funciona
- [ ] MCP server inicia com `npx ai-tool --mcp`

### Testes de Regressão (FASE 1-3)
- [ ] Resultados dos comandos são idênticos antes/depois (output JSON comparável)
- [ ] Cache funciona corretamente
- [ ] Sugestões "você quis dizer?" funcionam
- [ ] Detecção de Cloud Functions funciona

### FASE 4: Suite de Testes (Estimado: 3-5 dias)
**NOTA:** Adiada para FASE 4 separada, pois o projeto não tem testes atualmente.

#### 17. Configurar framework de testes
- Decidir: `node:test` nativo vs Vitest vs Jest
- Criar `tests/setup.ts` com helpers mockados
- Adicionar script `npm test` ao package.json

#### 18. Criar tests para módulos novos (Fase 1)
- `tests/utils/file-matcher.test.ts`
- `tests/ts/utils.test.ts`
- `tests/commands/base.test.ts`

#### 19. Criar tests para módulos novos (Fase 2-3)
- `tests/utils/logger.test.ts`
- `tests/commands/describe.test.ts`
- `tests/integrations/git.test.ts` (mock git)

#### 20. Criar tests de integração
- Testar cada comando CLI com fixtures
- Testar MCP server com requests simulados
- Testar cache invalidation

#### 21. Verificação FASE 4
- [ ] `npm test` passa todos os testes
- [ ] Cobertura de testes para NOVOS módulos >70%
- [ ] Tests de integração cobrem fluxos principais

### Métricas de Sucesso (FASE 1-3)
- [ ] Linhas de código totais reduzidas em ~150 (apenas refatoração)
- [ ] Zero funções duplicadas (verified via grep)
- [ ] Tempo de execução dos comandos não aumentou significativamente (<10%)
- [ ] Caches existentes são invalidados corretamente ao mudar versão

### Métricas de Sucesso (FASE 4)
- [ ] Cobertura de testes para NOVOS módulos >70%
- [ ] Cobertura de testes total >50% (realista, partindo de 0%)
- [ ] Todos os comandos têm tests de integração
