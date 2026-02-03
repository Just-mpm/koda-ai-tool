# Diagnóstico - Cloud Functions não detectadas

## Sintomas
- `functions` retorna 0 functions
- `find healthCheck symbolType=trigger` não encontra nada
- `context` vê os exports mas não classifica como "trigger"
- `find` só encontra no arquivo compilado `.js`

## Possíveis Causas

### 1. tsconfig.json excluindo functions/
Se o tsconfig.json do projeto tem `"exclude": ["functions"]` ou `"files": []`, o ts-morph pode não conseguir parsear os arquivos corretamente.

**Verificar:** No projeto onde está testando, olhe o tsconfig.json e veja se há:
```json
{
  "exclude": ["functions", "functions/**"],
  // ou
  "files": [],
  // ou
  "references": []
}
```

### 2. Padrão de import diferente
O código atual detecta:
```typescript
// Padrão 1: Chamada direta
export const healthCheck = onRequest((req, res) => { ... })

// Padrão 2: Com namespace
export const healthCheck = https.onRequest((req, res) => { ... })

// Padrão 3: Com objeto de opções
export const healthCheck = onRequest({ region: REGION }, (req, res) => { ... })
```

Mas pode não detectar se o import for:
```typescript
import * as functions from "firebase-functions";
export const healthCheck = functions.https.onRequest(...)
```

### 3. Arquivo .js em functions/src sendo indexado
Se houver arquivos `.js` em `functions/src/` (compilados), eles podem estar sendo indexados em vez dos `.ts`.

## Como Debugar

Execute com debug habilitado:

```bash
# Windows CMD
set DEBUG_FUNCTIONS=true && ai-tool functions

# Windows PowerShell
$env:DEBUG_FUNCTIONS="true"; ai-tool functions

# Linux/Mac
DEBUG_FUNCTIONS=true ai-tool functions
```

Isso vai mostrar:
- Quais arquivos em functions/src/ foram encontrados
- Quantos foram adicionados ao projeto ts-morph
- Quantos símbolos do tipo "trigger" foram detectados
- Para cada CallExpression, se foi detectado como trigger ou não

## Teste Manual

Para testar se a detecção está funcionando, crie um arquivo de teste simples:

```typescript
// test-functions.ts
import { onCall, onRequest } from "firebase-functions/v2/https";

export const test1 = onCall((req) => {
  return { hello: "world" };
});

export const test2 = onRequest((req, res) => {
  res.send("hello");
});
```

E execute:
```bash
ai-tool context test-functions.ts
```

Deve mostrar `kind: trigger` para `test1` e `test2`.
