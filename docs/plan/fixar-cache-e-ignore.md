# Plano: Corrigir Cache e Ignore

## Contexto

Foram identificados **DOIS BUGS CRÍTICOS** que causam comportamentos incorretos no ai-tool:

### Bug 1: Cache com Hash XOR (Colisões)
O cache usa XOR para combinar timestamps dos arquivos, o que causa colisões quando múltiplos arquivos mudam. Isso faz o cache considerar que nada mudou, mesmo com alterações reais.

**Exemplo de colisão:**
- Arquivos A, B com mtimes `[1000, 2000]` → XOR = 1728
- Arquivos C, D, E com mtimes `[500, 1228, 0]` → XOR = 1728 (mesmo resultado!)

**Resultado:** Cache permanece válido incorretamente → informações desatualizadas.

### Bug 2: Ignore do Areas.config Não Respeitado
O comando `dead` executa o Knip diretamente sem repassar os padrões `ignore` do `areas.config.json`. Isso faz o Knip reportar código morto em arquivos que deveriam ser ignorados.

**Fluxo atual:**
1. Usuário define `"ignore": ["docs/**", "*.test.ts"]` no areas.config
2. Comando `dead` executa: `npx knip --reporter=json`
3. Knip **não sabe** sobre o ignore do areas.config
4. Knip reporta código morto em arquivos ignorados

**Resultado:** Falsos positivos de código morto.

---

## Decisões de Design

### Correção do Cache: Soma Simples (Opção A)
- Substituir XOR por soma aditiva
- Rápido, sem colisões práticas, simples de implementar

### Correção do Ignore: Gerar Config do Knip
- Criar arquivo `knip.json` temporário baseado no `ignore` do areas.config
- Executar Knip com essa config
- Remover arquivo após execução

**Alternativas consideradas:**
- ❌ Passar `--ignore` via CLI: Knip não suporta essa flag
- ❌ Modificar knip.json do usuário: Intrusivo, quebra config existente
- ❌ Filtros pós-processamento: Knip já executou, desperdício de CPU

---

## Padrões Seguidos

### Código Existente Reutilizado
- `getIgnorePatterns()` de `src/areas/config.ts` - já lê o ignore do config
- `writeFileSync()` de `fs` - para criar knip.json temporário
- `unlinkSync()` de `fs` - para limpar arquivo temporário

### Novo Código (Justificativa)
- Função `generateKnipConfig()` no `dead.ts` - específica para este comando

---

## Arquivos a Modificar

### 1. `src/cache/index.ts`
**Linha 107:** Trocar XOR por soma no cálculo de hash

```typescript
// ANES:
hashAccumulator ^= Math.floor(mtime);

// DEPOIS:
hashAccumulator += Math.floor(mtime);
```

**Linhas 127-136:** Adicionar indicador de existência do areas.config

```typescript
// ANES:
try {
  const configPath = join(cwd, CACHE_DIR, "areas.config.json");
  if (existsSync(configPath)) {
    const stat = statSync(configPath);
    hashAccumulator ^= Math.floor(stat.mtimeMs);
  }
} catch {
  // Ignorar se não existir
}

// DEPOIS:
const configExists = existsSync(join(cwd, CACHE_DIR, "areas.config.json"));
hashAccumulator += configExists ? 1 : 0; // Marca existência no hash

if (configExists) {
  try {
    const stat = statSync(join(cwd, CACHE_DIR, "areas.config.json"));
    hashAccumulator += Math.floor(stat.mtimeMs);
  } catch {
    // Ignorar erros de stat
  }
}
```

### 2. `src/commands/dead.ts`
**Adicionar import:**
```typescript
import { getIgnorePatterns } from "../areas/config.js";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
```

**Adicionar função antes de executar Knip:**
```typescript
/**
 * Gera arquivo knip.json temporário baseado no ignore do areas.config
 */
function generateKnipConfig(cwd: string): string | null {
  const ignorePatterns = getIgnorePatterns(cwd);

  if (ignorePatterns.length === 0) {
    return null; // Nenhum ignore, usar config do Knip
  }

  const knipConfig = {
    $schema: "https://unpkg.com/knip@5/schema.json",
    ignore: ignorePatterns,
  };

  const configPath = join(cwd, ".knip.ai-tool.json");
  writeFileSync(configPath, JSON.stringify(knipConfig, null, 2), "utf-8");

  return configPath;
}
```

**Modificar execução do Knip:**
```typescript
// ANES (linha 66):
const output = execSync("npx knip --reporter=json", {
  cwd,
  encoding: "utf-8",
  maxBuffer: 50 * 1024 * 1024,
  stdio: ["pipe", "pipe", "pipe"],
});

// DEPOIS:
const knipConfigPath = generateKnipConfig(cwd);
const configFlag = knipConfigPath ? `--config=${knipConfigPath}` : "";

const output = execSync(`npx knip ${configFlag} --reporter=json`, {
  cwd,
  encoding: "utf-8",
  maxBuffer: 50 * 1024 * 1024,
  stdio: ["pipe", "pipe", "pipe"],
});

// Limpar config temporária após execução
if (knipConfigPath && existsSync(knipConfigPath)) {
  try {
    unlinkSync(knipConfigPath);
  } catch {
    // Ignorar erro na remoção
  }
}
```

---

## Passos de Implementação

1. **Corrigir hash XOR → soma** em `src/cache/index.ts` (linha 107)
2. **Adicionar indicador de existência** do areas.config no hash (linhas 127-136)
3. **Adicionar imports** em `src/commands/dead.ts`
4. **Adicionar função `generateKnipConfig()`** em `src/commands/dead.ts`
5. **Modificar execução do Knip** para usar config temporária
6. **Testar manualmente:**
   - Modificar um arquivo e verificar se cache atualiza
   - Adicionar padrão no ignore e verificar se Knip respeita

---

## Verificação

### Teste do Cache
```bash
# 1. Limpar cache
rm .analyze/meta.json

# 2. Executar comando (gera cache)
ai-tool map

# 3. Verificar hash salvo
cat .analyze/meta.json | grep filesHash

# 4. Modificar um arquivo任意
touch src/cache/index.ts

# 5. Executar novamente (cache deve ser invalidado)
ai-tool map
# Deve mostrar "Regenerating cache..." ou similar

# 6. Verificar novo hash
cat .analyze/meta.json | grep filesHash
# Hash deve ser DIFERENTE
```

### Teste do Ignore
```bash
# 1. Criar arquivo de teste
echo "export const unused = () => {};" > src/test-unused.ts

# 2. Executar dead (deve encontrar)
ai-tool dead
# Deve mostrar src/test-unused.ts como código morto

# 3. Adicionar ao ignore
# Editar .analyze/areas.config.json:
# "ignore": ["src/test-unused.ts"]

# 4. Executar dead novamente
ai-tool dead
# NÃO deve mostrar src/test-unused.ts

# 5. Teste adicional: arquivo fora do ignore
echo "export const unused2 = () => {};" > src/test-unused-2.ts

# 6. Executar dead
ai-tool dead
# Deve mostrar src/test-unused-2.ts (não está no ignore)
# NÃO deve mostrar src/test-unused.ts (está no ignore)
```

---

## Notas Adicionais

- Arquivo temporário `.knip.ai-tool.json` é usado para não conflitar com config existente do usuário
- Se o usuário já tiver `knip.json`, o arquivo temporário sobrescreve via `--config`
- Cache é atualizado automaticamente após correção (próxima execução)

### Invalidação de Cache
O cache do comando `dead` é automaticamente invalidado quando `areas.config.json` é modificado porque o hash inclui o mtime desse arquivo (linha 132 do cache/index.ts). Isso garante que mudanças no `ignore` sejam respeitadas na próxima execução.

### .gitignore Atualizado
O arquivo `.gitignore` foi atualizado para incluir:
- `knip.json` - config padrão do Knip
- `.knip.ai-tool.json` - config temporária gerada pelo ai-tool
