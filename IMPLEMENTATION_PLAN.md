# Plano de Implementação - Top 3 Features

> Baseado em pesquisa realizada em Janeiro/2025

---

## Resumo das Features

| Feature | Descrição | Complexidade |
|---------|-----------|--------------|
| `context` | Extrai assinaturas/tipos de um arquivo | Média |
| `suggest` | Sugere arquivos para ler antes de modificar | Baixa |
| MCP Server | Integração nativa com Claude | Média |

---

## 1. Comando `context` - Contexto compacto para IA

### O que faz
Extrai assinaturas de funções, types e interfaces de um arquivo **sem incluir implementação**.
Economiza tokens ao dar à IA o "contrato" do arquivo.

### Dependência necessária

```bash
npm install ts-morph
```

**Por que ts-morph?**
- Wrapper oficial sobre TypeScript Compiler API
- API mais amigável que usar `typescript` diretamente
- Facilita navegação no AST
- Bem documentado: https://ts-morph.com/

### Como funciona

```typescript
import { Project } from "ts-morph";

// Criar projeto TypeScript
const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Adicionar arquivo
const sourceFile = project.getSourceFileOrThrow("src/hooks/useAuth.ts");

// Extrair funções
for (const func of sourceFile.getFunctions()) {
  const name = func.getName();
  const params = func.getParameters().map(p =>
    `${p.getName()}: ${p.getType().getText()}`
  );
  const returnType = func.getReturnType().getText();

  console.log(`${name}(${params.join(", ")}): ${returnType}`);
}

// Extrair interfaces
for (const iface of sourceFile.getInterfaces()) {
  const name = iface.getName();
  const props = iface.getProperties().map(p =>
    `${p.getName()}: ${p.getType().getText()}`
  );
  console.log(`interface ${name} { ${props.join("; ")} }`);
}

// Extrair types
for (const type of sourceFile.getTypeAliases()) {
  console.log(`type ${type.getName()} = ${type.getType().getText()}`);
}
```

### Estrutura do output

```typescript
interface ContextResult {
  file: string;
  category: FileCategory;
  exports: ExportInfo[];
  imports: ImportInfo[];
  types: TypeInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

interface FunctionInfo {
  name: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  isAsync: boolean;
  isExported: boolean;
  jsdoc?: string;
}

interface TypeInfo {
  name: string;
  definition: string; // tipo expandido
  isExported: boolean;
}
```

### Output exemplo (text)

```
📄 src/hooks/useAuth.ts [hook]

━━━ EXPORTS ━━━
function useAuth(): { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void; isLoading: boolean }

━━━ IMPORTS ━━━
firebase/auth     → { signInWithEmailAndPassword, signOut, onAuthStateChanged }
./authContext     → { AuthContext }
@/types/user      → { User }

━━━ TYPES ━━━
type AuthState = { user: User | null; isLoading: boolean }
```

### Arquivos a criar

```
src/
├── commands/
│   └── context.ts      # Comando principal
├── ts/
│   └── extractor.ts    # Lógica de extração com ts-morph
└── formatters/
    └── text.ts         # Adicionar formatContextText()
```

### Referências
- [ts-morph Documentation](https://ts-morph.com/)
- [ts-morph Functions](https://ts-morph.com/details/functions)
- [ts-morph Types](https://ts-morph.com/details/types)
- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)

---

## 2. Comando `suggest` - O que ler antes de modificar

### O que faz
Dado um arquivo target, sugere quais outros arquivos a IA deveria ler primeiro, ordenados por relevância.

### Dependências
**Nenhuma nova!** Usa o grafo de dependências que já temos do Skott.

### Lógica de priorização

```typescript
interface SuggestResult {
  target: string;
  suggestions: Suggestion[];
}

interface Suggestion {
  path: string;
  category: FileCategory;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
}
```

**Ordem de prioridade:**

1. **Critical** - Types/interfaces usadas como props ou returns
2. **High** - Dependências diretas (imports do arquivo)
3. **Medium** - Quem usa este arquivo (upstream direto)
4. **Low** - Testes relacionados, arquivos no mesmo módulo

### Algoritmo

```typescript
async function suggest(target: string): Promise<SuggestResult> {
  // 1. Obter grafo (do cache ou gerar)
  const graph = await getGraph(cwd);

  // 2. Encontrar o arquivo
  const targetPath = findTargetFile(target, graph.files);

  // 3. Coletar sugestões
  const suggestions: Suggestion[] = [];

  // 3a. Dependências diretas (o que este arquivo importa)
  const directDeps = graph[targetPath].adjacentTo;
  for (const dep of directDeps) {
    const category = detectCategory(dep);

    // Types são críticos
    if (category === "type") {
      suggestions.push({
        path: dep,
        category,
        reason: "Define tipos usados neste arquivo",
        priority: "critical",
      });
    } else {
      suggestions.push({
        path: dep,
        category,
        reason: `Importado por ${targetPath.split("/").pop()}`,
        priority: "high",
      });
    }
  }

  // 3b. Quem usa este arquivo (upstream)
  const upstream = findUpstream(targetPath, graph);
  for (const file of upstream.slice(0, 5)) {
    suggestions.push({
      path: file,
      category: detectCategory(file),
      reason: "Usa este arquivo - pode quebrar com mudanças",
      priority: "medium",
    });
  }

  // 3c. Testes relacionados
  const testFile = findRelatedTest(targetPath, graph.files);
  if (testFile) {
    suggestions.push({
      path: testFile,
      category: "test",
      reason: "Testes existentes para manter",
      priority: "low",
    });
  }

  // 4. Ordenar por prioridade
  return sortByPriority(suggestions);
}
```

### Output exemplo (text)

```
📍 Antes de modificar: src/components/Header.tsx

━━━ LEITURA CRÍTICA ━━━
📝 src/types/navigation.ts
   Define tipos usados neste arquivo

━━━ ALTA PRIORIDADE ━━━
🪝 src/hooks/useAuth.ts
   Importado por Header.tsx
🧩 src/components/NavLink.tsx
   Importado por Header.tsx
🗄️ src/context/ThemeContext.ts
   Importado por Header.tsx

━━━ MÉDIA PRIORIDADE ━━━
📄 src/pages/dashboard.tsx
   Usa este arquivo - pode quebrar com mudanças
📄 src/pages/settings.tsx
   Usa este arquivo - pode quebrar com mudanças

━━━ BAIXA PRIORIDADE ━━━
🧪 __tests__/Header.test.tsx
   Testes existentes para manter
```

### Arquivos a criar

```
src/
└── commands/
    └── suggest.ts      # Comando principal (usa grafo existente)
```

---

## 3. MCP Server - Integração nativa com Claude

### O que faz
Expõe ai-tool como servidor MCP para uso direto pelo Claude Code sem rodar CLI.

### Dependência necessária

```bash
npm install @modelcontextprotocol/sdk zod
```

**Versões recomendadas:**
- `@modelcontextprotocol/sdk`: ^1.6.1
- `zod`: ^3.23.8

### Convenções de Nomenclatura

**Servidor:** `{service}-mcp-server` (lowercase com hífens)
- Exemplo: `ai-tool-mcp-server`

**Tools:** `{service}_{action}_{resource}` (snake_case com prefixo)
- Exemplo: `aitool_project_map`, `aitool_impact_analysis`

### API Correta - registerTool (NÃO usar server.tool)

**IMPORTANTE:** Usar `server.registerTool()` - a API moderna.
**NÃO usar:** `server.tool()` (deprecated)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { map, dead, impact } from "./commands/index.js";

// Criar servidor
const server = new McpServer({
  name: "ai-tool-mcp-server",
  version: "1.0.0",
});

// ============================================================================
// SCHEMAS (Zod com .strict() e .describe())
// ============================================================================

const ProjectMapInputSchema = z.object({
  format: z.enum(["text", "json"])
    .default("text")
    .describe("Formato de saída: 'text' para humanos, 'json' para máquinas"),
  cwd: z.string()
    .optional()
    .describe("Diretório do projeto (default: cwd atual)"),
}).strict();

type ProjectMapInput = z.infer<typeof ProjectMapInputSchema>;

const ImpactAnalysisInputSchema = z.object({
  target: z.string()
    .min(1, "Target é obrigatório")
    .describe("Arquivo para analisar (nome ou caminho relativo)"),
  format: z.enum(["text", "json"])
    .default("text")
    .describe("Formato de saída"),
  cwd: z.string()
    .optional()
    .describe("Diretório do projeto"),
}).strict();

type ImpactAnalysisInput = z.infer<typeof ImpactAnalysisInputSchema>;

const SuggestReadsInputSchema = z.object({
  target: z.string()
    .min(1, "Target é obrigatório")
    .describe("Arquivo que será modificado"),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Número máximo de sugestões"),
  cwd: z.string()
    .optional()
    .describe("Diretório do projeto"),
}).strict();

type SuggestReadsInput = z.infer<typeof SuggestReadsInputSchema>;

// ============================================================================
// TOOLS - Usando registerTool com config completa
// ============================================================================

server.registerTool(
  "aitool_project_map",
  {
    title: "Project Map",
    description: `Gera mapa completo do projeto com categorização automática de arquivos.

Analisa a estrutura do projeto usando Skott e retorna:
- Contagem de arquivos por categoria (pages, components, hooks, services, etc.)
- Estrutura de pastas com estatísticas
- Dependências circulares detectadas

Args:
  - format ('text' | 'json'): Formato de saída (default: 'text')
  - cwd (string, optional): Diretório do projeto

Returns:
  Mapa estruturado do projeto com categorias e dependências.

Examples:
  - "Mostre a estrutura do projeto" → format: "text"
  - "Liste arquivos do projeto em JSON" → format: "json"`,
    inputSchema: ProjectMapInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: ProjectMapInput) => {
    try {
      const result = await map({
        format: params.format,
        cwd: params.cwd,
      });

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Erro ao gerar mapa: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }
);

server.registerTool(
  "aitool_dead_code",
  {
    title: "Dead Code Detection",
    description: `Detecta código morto no projeto usando Knip.

Identifica:
- Arquivos órfãos (não importados por ninguém)
- Exports não utilizados
- Dependências npm não usadas

Args:
  - format ('text' | 'json'): Formato de saída (default: 'text')
  - cwd (string, optional): Diretório do projeto

Returns:
  Lista de código morto com sugestões de limpeza.

Examples:
  - "Encontre código não usado" → format: "text"
  - "Liste exports mortos" → format: "text"`,
    inputSchema: ProjectMapInputSchema, // Mesmo schema
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: ProjectMapInput) => {
    try {
      const result = await dead({
        format: params.format,
        cwd: params.cwd,
      });

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Erro ao detectar código morto: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }
);

server.registerTool(
  "aitool_impact_analysis",
  {
    title: "Impact Analysis",
    description: `Analisa o impacto de modificar um arquivo específico.

Mostra:
- Upstream: Quem importa este arquivo (direto e indireto)
- Downstream: O que este arquivo importa
- Riscos: Arquivo crítico, dependências circulares, etc.
- Sugestões: O que testar e verificar

Args:
  - target (string): Arquivo para analisar (nome ou caminho)
  - format ('text' | 'json'): Formato de saída (default: 'text')
  - cwd (string, optional): Diretório do projeto

Returns:
  Análise completa de impacto com riscos e sugestões.

Examples:
  - "Qual o impacto de mudar useAuth?" → target: "useAuth"
  - "Quem usa o Header.tsx?" → target: "Header.tsx"
  - "Analise Button" → target: "Button"`,
    inputSchema: ImpactAnalysisInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: ImpactAnalysisInput) => {
    try {
      const result = await impact(params.target, {
        format: params.format,
        cwd: params.cwd,
      });

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Erro na análise de impacto: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }
);

server.registerTool(
  "aitool_suggest_reads",
  {
    title: "Suggest Files to Read",
    description: `Sugere arquivos que devem ser lidos antes de modificar um arquivo.

Retorna lista priorizada:
- Critical: Types/interfaces usadas como props ou returns
- High: Dependências diretas (imports do arquivo)
- Medium: Quem usa este arquivo (pode quebrar)
- Low: Testes relacionados

Args:
  - target (string): Arquivo que será modificado
  - limit (number): Máximo de sugestões (default: 10, max: 50)
  - cwd (string, optional): Diretório do projeto

Returns:
  Lista ordenada de arquivos para ler com razões.

Examples:
  - "O que ler antes de mudar Header?" → target: "Header"
  - "Contexto para editar useAuth" → target: "useAuth"`,
    inputSchema: SuggestReadsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: SuggestReadsInput) => {
    try {
      // Importar dinamicamente (será implementado)
      const { suggest } = await import("./commands/suggest.js");
      const result = await suggest(params.target, {
        limit: params.limit,
        cwd: params.cwd,
      });

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Erro ao sugerir arquivos: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }
);

server.registerTool(
  "aitool_file_context",
  {
    title: "File Context (Signatures)",
    description: `Extrai assinaturas de funções e tipos de um arquivo SEM implementação.

Retorna apenas:
- Assinaturas de funções exportadas
- Interfaces e types definidos
- Imports do arquivo

Ideal para entender o "contrato" de um arquivo gastando poucos tokens.

Args:
  - target (string): Arquivo para extrair contexto
  - cwd (string, optional): Diretório do projeto

Returns:
  Assinaturas e tipos do arquivo em formato compacto.

Examples:
  - "Mostre a API do useAuth" → target: "useAuth"
  - "Quais funções o utils exporta?" → target: "utils"`,
    inputSchema: z.object({
      target: z.string()
        .min(1)
        .describe("Arquivo para extrair contexto"),
      cwd: z.string()
        .optional()
        .describe("Diretório do projeto"),
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      // Importar dinamicamente (será implementado)
      const { context } = await import("./commands/context.js");
      const result = await context(params.target, { cwd: params.cwd });

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Erro ao extrair contexto: ${error instanceof Error ? error.message : String(error)}`
        }],
      };
    }
  }
);

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // IMPORTANTE: Usar console.error para logs (stdout é para JSON-RPC)
  console.error("ai-tool MCP server running via stdio");
}
```

### Configuração do usuário

O usuário adiciona ao `claude_desktop_config.json` ou settings do Claude Code:

```json
{
  "mcpServers": {
    "ai-tool": {
      "command": "npx",
      "args": ["@justmpm/ai-tool", "--mcp"]
    }
  }
}
```

### CLI flag --mcp

Modificar `cli.ts` para detectar `--mcp`:

```typescript
// No início do main()
if (flags.mcp) {
  const { startMcpServer } = await import("./mcp/server.js");
  await startMcpServer();
  return; // Fica rodando indefinidamente
}
```

### Arquivos a criar

```
src/
└── mcp/
    └── server.ts       # Servidor MCP completo (schemas + tools + init)
```

### Regras importantes

1. **Nunca usar `console.log()` no modo MCP!**
   - Stdout é para JSON-RPC
   - Usar `console.error()` para debug

2. **Usar `.strict()` em todos os Zod schemas**
   - Rejeita campos extras não definidos

3. **Incluir annotations em todas as tools**
   - `readOnlyHint`: true para consultas
   - `destructiveHint`: false se não modifica nada
   - `idempotentHint`: true se pode repetir sem efeitos colaterais

4. **Descrições devem incluir:**
   - O que a tool faz
   - Lista de Args com tipos
   - Returns explicando o output
   - Examples de quando usar

### Referências
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Build an MCP Server](https://modelcontextprotocol.io/docs/develop/build-server)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

---

## Ordem de Implementação Sugerida

### Fase 1: `suggest` (mais fácil)
- Usa infraestrutura existente (grafo do Skott)
- Nenhuma dependência nova
- ~2-3 horas de trabalho

### Fase 2: `context` (média)
- Adiciona `ts-morph`
- Lógica de extração de tipos
- ~4-6 horas de trabalho

### Fase 3: MCP Server (média)
- Adiciona `@modelcontextprotocol/sdk`
- Wrapper das funções existentes
- ~3-4 horas de trabalho

---

## Dependências Finais

```json
{
  "dependencies": {
    "knip": "^5.44.0",
    "skott": "^0.35.2",
    "ts-morph": "^24.0.0",
    "@modelcontextprotocol/sdk": "^1.6.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsup": "^8.5.0",
    "typescript": "^5.8.3"
  }
}
```

**Nota:** Zod é dependency direta (não peer) porque o MCP SDK usa internamente.

---

## Checklist de Implementação

### `suggest`
- [ ] Criar `src/commands/suggest.ts`
- [ ] Implementar lógica de priorização
- [ ] Adicionar `formatSuggestText()` em formatters
- [ ] Adicionar tipos `SuggestResult`, `Suggestion` em types.ts
- [ ] Adicionar comando na CLI
- [ ] Exportar em `index.ts`
- [ ] Testar com diferentes arquivos

### `context`
- [ ] Instalar `ts-morph`
- [ ] Criar `src/ts/extractor.ts` com funções de extração
- [ ] Criar `src/commands/context.ts`
- [ ] Adicionar `formatContextText()` em formatters
- [ ] Adicionar tipos `ContextResult`, `FunctionInfo`, `TypeInfo` em types.ts
- [ ] Adicionar comando na CLI
- [ ] Exportar em `index.ts`
- [ ] Testar com hooks, componentes, utils

### MCP Server
- [ ] Instalar `@modelcontextprotocol/sdk` e `zod`
- [ ] Criar `src/mcp/server.ts` com estrutura completa
- [ ] Usar `server.registerTool()` (NÃO server.tool)
- [ ] Incluir `title`, `description`, `inputSchema`, `annotations` em cada tool
- [ ] Usar Zod schemas com `.strict()` e `.describe()`
- [ ] Descrições com Args, Returns, Examples
- [ ] Adicionar flag `--mcp` na CLI
- [ ] Testar: `node dist/cli.js --mcp` (deve ficar ouvindo)
- [ ] Documentar configuração no README

---

## Quality Checklist (MCP Server)

Baseado nas melhores práticas oficiais:

### Design
- [ ] Tool names usam snake_case com prefixo: `aitool_*`
- [ ] Descrições são específicas e não ambíguas
- [ ] Annotations corretas (readOnlyHint, destructiveHint, etc.)
- [ ] Error messages são claras e acionáveis

### Implementação
- [ ] Usando `registerTool()` (API moderna)
- [ ] Zod schemas com `.strict()` para rejeitar campos extras
- [ ] Todos os schemas têm `.describe()` nos campos
- [ ] Try/catch com mensagens de erro úteis
- [ ] Nunca usar `console.log()` (usar `console.error()`)

### TypeScript
- [ ] Tipos explícitos em todos os parâmetros
- [ ] Nenhum uso de `any`
- [ ] Interfaces definidas para todos os dados
- [ ] `z.infer<>` para derivar tipos dos schemas

### Build
- [ ] `npm run build` completa sem erros
- [ ] `dist/cli.js` existe e é executável
- [ ] Imports resolvem corretamente

---

## Estrutura Final do Projeto

```
src/
├── cli.ts                 # CLI principal (adicionar --mcp)
├── index.ts               # Exports públicos
├── types.ts               # Tipos TypeScript
├── commands/
│   ├── map.ts             # ✅ Existente
│   ├── dead.ts            # ✅ Existente
│   ├── impact.ts          # ✅ Existente
│   ├── suggest.ts         # 🆕 Novo
│   └── context.ts         # 🆕 Novo
├── mcp/
│   └── server.ts          # 🆕 MCP Server
├── ts/
│   └── extractor.ts       # 🆕 Extração com ts-morph
├── cache/
│   └── index.ts           # ✅ Existente
├── formatters/
│   └── text.ts            # ✅ Existente (adicionar novos)
└── utils/
    └── detect.ts          # ✅ Existente
```

---

## Próximos Passos

1. **Implementar `suggest`** (sem deps novas)
2. **Implementar `context`** (adiciona ts-morph)
3. **Implementar MCP Server** (adiciona @modelcontextprotocol/sdk)
4. Atualizar README com documentação
5. Publicar versão 0.3.0
