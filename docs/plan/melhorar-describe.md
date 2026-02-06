# Plano: Melhorar Busca do Comando `describe`

## Contexto

O comando `describe` atual busca areas por descricao, mas so verifica nos **metadados das areas** (id, name, description). Isso causa falhas em buscas como "lista de alunos da turma" quando a area se chama "students" com description "Gerenciamento de alunos".

### Problemas Identificados

1. **Match "tudo ou nada"** - Exige que TODAS as palavras da query existam no texto. Se 3 de 4 palavras batem, score = 0 (nao encontra)
2. **Sem stopwords** - Palavras como "de", "da", "do", "lista", "para" poluem a busca
3. **Keywords do config ignoradas** - O campo `keywords` da area NAO e incluido no `searchableText`
4. **Sem acesso aos nomes reais** - Nao busca nos nomes de arquivos nem simbolos (funcoes, tipos, componentes) da area

### Decisoes Tomadas

| Decisao | Escolha |
|---------|---------|
| Performance do indice de simbolos | **Sempre carregar** - Carrega indice em toda busca (usa cache quando disponivel) |
| Extracao de nomes de arquivos | **Expandir globs** - Usar `getAllCodeFiles()` + `detectFileAreas()` |
| Calculo de score | **Percentual simples** - `1 - (encontradas / total)`, threshold 40% |

### Infraestrutura Existente Reutilizavel

| O que                        | Onde                              | Status     |
|------------------------------|-----------------------------------|------------|
| `detectFileAreas()`          | `src/areas/detector.ts:37`        | Pronto     |
| `getAllCodeFiles()` (exportada) | `src/ts/index.ts:135`          | Pronto     |
| `indexProject()` / cache     | `src/ts/cache.ts:111`             | Pronto     |
| `getCachedSymbolsIndex()`    | `src/cache/index.ts:333`          | Pronto     |
| `isCacheValid()`             | `src/cache/index.ts:166`          | Pronto     |
| `cacheSymbolsIndex()`        | `src/cache/index.ts:325`          | Pronto     |
| `updateCacheMeta()`          | `src/cache/index.ts:240`          | Pronto     |
| `readConfig()`               | `src/areas/config.ts:55`          | Ja em uso  |
| `isFileIgnored()`            | `src/areas/detector.ts:18`        | Pronto     |
| Padrao area_context           | `src/commands/context.ts:229-260` | Referencia |

**Nota sobre `getAllCodeFiles`:** Existem 5 copias privadas desta funcao (area.ts, areas.ts, areas-init.ts, context.ts, e a versao exportada em ts/index.ts). O plano usa a **versao exportada de `src/ts/index.ts:135`** para evitar mais duplicacao.

## Reutilizacao e Padroes

### Codigo Reutilizado

- `readConfig(cwd)` de `src/areas/config.ts` - ja em uso
- `detectFileAreas(filePath, config)` de `src/areas/detector.ts` - para resolver arquivos de cada area
- `getAllCodeFiles(cwd)` de `src/ts/index.ts` (versao exportada) - para listar todos os arquivos
- `indexProject(cwd)` de `src/ts/cache.ts` - para gerar indice de simbolos
- `getCachedSymbolsIndex(cwd)` / `isCacheValid(cwd)` / `cacheSymbolsIndex()` / `updateCacheMeta()` de `src/cache/index.ts` - para cache do indice
- `isFileIgnored()` de `src/areas/detector.ts` - para respeitar padroes de ignore
- Padrao identico de carga de indice com cache de `areaContext()` em `src/commands/context.ts:242-260`
- `type ProjectIndex` de `src/ts/cache.ts` - tipo do indice

### Padroes Seguidos

- Mesmo padrao de carga de indice com cache que `areaContext()` usa (linhas 242-260 de context.ts), incluindo `updateCacheMeta(cwd)`
- Mesma normalizacao de paths (`filePath.replace(/\\/g, "/")`)
- Mesmo padrao de `formatOutput` com formatters text/json
- Mesmo padrao de imports (areas/config, areas/detector, cache/index, ts/cache)

### Codigo Novo (justificativa)

- **`STOPWORDS` (constante)** - Nao existe no projeto. Lista de ~30 palavras comuns PT-BR/EN que poluem buscas. Justificativa: necessario para filtrar queries como "lista de alunos da turma" -> ["alunos", "turma"]
- **`removeStopwords(words)` (funcao exportada)** - Filtra stopwords de um array de palavras. Exportada para permitir teste direto. Simples, ~5 linhas
- **`buildSearchableText(candidate, areaFileMap, index)` (funcao)** - Monta texto enriquecido combinando metadados + keywords + nomes de arquivos + nomes de simbolos. Justificativa: centraliza a logica de enriquecimento em um unico lugar
- **`calculatePartialScore(queryWords, searchableText)` (funcao exportada)** - Substitui `calculateRelevanceScore()` com scoring parcial baseado em percentual de palavras encontradas. Exportada para permitir teste direto

## Arquivos a Modificar

| Arquivo | O que fazer |
|---------|-------------|
| `src/commands/describe.ts` | Reescrever `findAreaMatches()` e `calculateRelevanceScore()`. Adicionar stopwords, keywords, score parcial, enriquecer com nomes de arquivos e simbolos. Novos imports (ver lista completa abaixo). |
| `tests/commands/describe.test.ts` | Adicionar testes para `removeStopwords` e `calculatePartialScore` (exportadas), testes de integracao para busca enriquecida, e atualizar testes de formatacao. |

### Imports Necessarios em `describe.ts`

**Novos imports a adicionar:**
```typescript
import { detectFileAreas, isFileIgnored } from "../areas/detector.js";
import { getAllCodeFiles } from "../ts/index.js";
import { indexProject, type ProjectIndex } from "../ts/cache.js";
import {
  isCacheValid,
  getCachedSymbolsIndex,
  cacheSymbolsIndex,
  updateCacheMeta,
} from "../cache/index.js";
import type { AreasConfigFile } from "../types.js";
```

**Imports que permanecem:**
```typescript
import { readConfig } from "../areas/config.js";
import { parseCommandOptions, formatOutput } from "./base.js";
import { findSimilar } from "../utils/similarity.js";
```

**Nota:** `src/utils/similarity.ts` NAO sera alterado. Levenshtein continua funcionando igual para sugestoes "voce quis dizer?"

## Passos de Implementacao

### Passo 1: Adicionar stopwords e funcao de filtragem

Criar em `src/commands/describe.ts`:

```typescript
const STOPWORDS = new Set([
  // PT-BR
  "de", "da", "do", "das", "dos", "para", "com", "em", "uma", "um",
  "o", "a", "os", "as", "no", "na", "nos", "nas", "pelo", "pela",
  "que", "e", "ou", "se", "ao", "aos",
  // EN
  "the", "of", "in", "for", "with", "on", "at", "to", "and", "or",
  "is", "are", "was", "by", "an",
]);

export function removeStopwords(words: string[]): string[] {
  const filtered = words.filter((w) => !STOPWORDS.has(w) && w.length > 1);
  // Se filtrou tudo, retorna original (evita query vazia)
  return filtered.length > 0 ? filtered : words;
}
```

**Nota:** Funcao exportada para permitir teste unitario direto.

### Passo 2: Implementar score parcial

Nova funcao `calculatePartialScore()` (exportada para teste direto):

```typescript
export function calculatePartialScore(queryWords: string[], searchableText: string): number {
  if (queryWords.length === 0) return 1;

  // Substring match completo da query = melhor score possivel
  const fullQuery = queryWords.join(" ");
  if (searchableText.includes(fullQuery)) return 0;

  // Score parcial: quantas palavras foram encontradas
  let found = 0;
  for (const word of queryWords) {
    if (searchableText.includes(word)) {
      found++;
    }
  }

  return 1 - (found / queryWords.length);
}
```

Exemplos:
- Query "lista de alunos da turma" (apos stopwords: ["alunos", "turma"])
- Area com description "Gerenciamento de alunos e turmas"
- "alunos" encontrado, "turma" encontrado (via "turmas" contem "turma") = 2/2 = score 0.0

Threshold: `score < 0.6` (pelo menos 40% das palavras devem bater)

### Passo 3: Construir mapa area->arquivos (otimizado)

Em vez de chamar `detectFileAreas` para cada arquivo para cada area (N*M chamadas), construir o mapa UMA vez:

```typescript
function buildAreaFileMap(
  allFiles: string[],
  config: AreasConfigFile
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const filePath of allFiles) {
    if (isFileIgnored(filePath, config)) continue;
    const fileAreas = detectFileAreas(filePath, config);
    for (const areaId of fileAreas) {
      if (!map.has(areaId)) map.set(areaId, []);
      map.get(areaId)!.push(filePath);
    }
  }

  return map;
}
```

### Passo 4: Construir texto enriquecido

Nova funcao `buildSearchableText()`:

```typescript
function buildSearchableText(
  candidate: { id: string; name: string; description: string },
  config: AreasConfigFile,
  areaFileMap: Map<string, string[]>,
  index: ProjectIndex
): string {
  // 1. Metadados (ja existe)
  const metadata = `${candidate.id} ${candidate.name} ${candidate.description}`;

  // 2. Keywords do config (NOVO)
  const keywords = config.areas[candidate.id]?.keywords?.join(" ") || "";

  // 3. Nomes de arquivos reais (NOVO)
  const areaFiles = areaFileMap.get(candidate.id) || [];
  const fileNames = areaFiles.map((f) => {
    const name = f.split("/").pop() || "";
    return name.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  }).join(" ");

  // 4. Nomes de simbolos exportados (NOVO)
  const symbolNames: string[] = [];
  for (const filePath of areaFiles) {
    const fileData = index.files[filePath];
    if (fileData?.symbols) {
      for (const symbol of fileData.symbols) {
        if (symbol.isExported) {
          symbolNames.push(symbol.name);
        }
      }
    }
  }

  return `${metadata} ${keywords} ${fileNames} ${symbolNames.join(" ")}`.toLowerCase();
}
```

### Passo 5: Reescrever `findAreaMatches()` (sincrona)

A funcao continua **sincrona** (todas as dependencias sao sincronas: `getAllCodeFiles`, `indexProject`, `detectFileAreas`, etc.).

**Nova assinatura:**
```typescript
function findAreaMatches(
  normalizedQuery: string,
  candidates: Array<{ id: string; name: string; description: string }>,
  config: AreasConfigFile,
  cwd: string
): AreaMatch[]
```

**Logica:**
1. Listar todos os arquivos: `getAllCodeFiles(cwd)` (de `src/ts/index.js`)
2. Carregar indice de simbolos (com cache, padrao identico ao `areaContext`):
   ```typescript
   let index: ProjectIndex;
   if (isCacheValid(cwd)) {
     const cached = getCachedSymbolsIndex<ProjectIndex>(cwd);
     if (cached?.files) {
       index = cached;
     } else {
       index = indexProject(cwd);
       cacheSymbolsIndex(cwd, index);
       updateCacheMeta(cwd);
     }
   } else {
     index = indexProject(cwd);
     cacheSymbolsIndex(cwd, index);
     updateCacheMeta(cwd);
   }
   ```
3. Construir mapa area->arquivos UMA vez: `buildAreaFileMap(allFiles, config)`
4. Filtrar stopwords da query: `removeStopwords(normalizedQuery.split(/\s+/))`
5. Para cada area candidata:
   - Construir `searchableText` enriquecido via `buildSearchableText()`
   - Calcular score parcial via `calculatePartialScore()`
6. Filtrar por threshold (`score < 0.6`)
7. Ordenar por score (menor = melhor)

**Nota:** `describe()` passa `cwd` para `findAreaMatches()`:
```typescript
const matches = findAreaMatches(normalizedQuery, candidates, config, cwd);
```

### Passo 6: Atualizar `getAreaFiles()` para usar mapa

A funcao `getAreaFiles()` hoje retorna placeholder. Como o mapa area->arquivos ja e construido no passo 5, passar os arquivos reais. A contagem `fileCount` sera a contagem real.

Opcionalmente, remover `getAreaFiles()` e usar diretamente o mapa.

### Passo 7: Remover `calculateRelevanceScore()`

A funcao antiga `calculateRelevanceScore()` (linhas 176-193) sera removida e substituida por `calculatePartialScore()`.

### Passo 8: Atualizar testes

**Testes unitarios (funcoes exportadas):**
- `removeStopwords(["lista", "de", "alunos"])` -> `["lista", "alunos"]` (nota: "lista" tem > 1 char e nao e stopword)
- `removeStopwords(["de", "da", "do"])` -> `["de", "da", "do"]` (retorna original se filtrou tudo)
- `removeStopwords(["login"])` -> `["login"]`
- `calculatePartialScore(["alunos", "turma"], "auth autenticacao alunos turma")` -> `0`
- `calculatePartialScore(["alunos", "turma"], "auth autenticacao alunos")` -> `0.5`
- `calculatePartialScore(["alunos", "turma"], "auth autenticacao")` -> `1`
- `calculatePartialScore([], "qualquer texto")` -> `1`

**Testes de formatacao:**
- Atualizar testes existentes de `formatDescribeText()` se scores mudarem
- Testar com multiplas areas e scores parciais (ex: 0.0, 0.3, 0.5)

## Verificacao

- [ ] `npx ai-tool describe "autenticacao"` continua encontrando area auth
- [ ] `npx ai-tool describe "lista de alunos da turma"` encontra area students (se configurada com keywords ["aluno", "turma"] ou arquivos como StudentList.tsx)
- [ ] `npx ai-tool describe "login"` encontra area auth (via keywords)
- [ ] `npx ai-tool describe "de da do"` retorna resultados (fallback retorna palavras originais, busca parcial pode encontrar algo)
- [ ] `npx ai-tool describe "useAuth"` encontra area auth (via simbolos)
- [ ] `npx ai-tool describe "StudentList"` encontra area correta (via nome de arquivo)
- [ ] Performance: usa cache de simbolos quando disponivel
- [ ] Testes passam: `node --test tests/commands/describe.test.ts`
- [ ] Build passa: `npm run build`
