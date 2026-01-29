# ai-tool

Ferramenta de análise de dependências e impacto para projetos TypeScript/JavaScript.

Usa [Skott](https://github.com/antoine-coulon/skott) + [Knip](https://knip.dev) internamente para análise precisa.

## Instalação

```bash
# Via npx (sem instalar)
npx ai-tool map
npx ai-tool dead
npx ai-tool impact Button

# Ou instalar globalmente
npm install -g ai-tool

# Ou como devDependency
npm install -D ai-tool
```

## Comandos

### `map` - Mapa do Projeto

Gera um mapa completo do projeto com categorização de arquivos.

```bash
ai-tool map
ai-tool map --format=json
```

**Output:**
- Total de arquivos e pastas
- Categorização automática (component, hook, service, util, etc.)
- Estrutura de pastas
- Dependências circulares detectadas

### `dead` - Código Morto

Detecta arquivos, exports e dependências não utilizados.

```bash
ai-tool dead
ai-tool dead --format=json
ai-tool dead --fix  # Remove automaticamente
```

**Detecta:**
- Arquivos órfãos (ninguém importa)
- Exports não utilizados
- Dependências npm não usadas

### `impact` - Análise de Impacto

Analisa o impacto de modificar um arquivo específico.

```bash
ai-tool impact Button
ai-tool impact src/components/Button.tsx
ai-tool impact useAuth --format=json
```

**Output:**
- **Upstream**: Quem importa este arquivo (afetados por mudanças)
- **Downstream**: O que este arquivo importa (dependências)
- **Riscos**: Arquivo crítico, dependências circulares, etc.
- **Sugestões**: Recomendações para modificação segura

## Uso Programático

```typescript
import { map, dead, impact } from "ai-tool";

// Mapa do projeto
const projectMap = await map({ format: "json" });

// Código morto
const deadCode = await dead({ format: "json" });

// Análise de impacto
const analysis = await impact("src/components/Button.tsx", {
  format: "json"
});
```

## Opções

| Opção | Descrição | Default |
|-------|-----------|---------|
| `--format=text\|json` | Formato de saída | `text` |
| `--cwd=<path>` | Diretório do projeto | `process.cwd()` |
| `--fix` | Remove código morto (só para `dead`) | `false` |

## Categorias de Arquivos

O ai-tool categoriza automaticamente os arquivos:

| Categoria | Descrição |
|-----------|-----------|
| `page` | Páginas (Next.js, etc.) |
| `layout` | Layouts |
| `route` | Rotas de API |
| `component` | Componentes React/Vue |
| `hook` | React Hooks |
| `service` | Serviços/API |
| `store` | Estado global (Redux, Zustand, Context) |
| `util` | Utilitários |
| `type` | Tipos TypeScript |
| `config` | Configurações |
| `test` | Testes |
| `other` | Outros |

## Integração com IA

Este pacote foi criado para ser usado com ferramentas de IA como Claude Code, OpenCode, etc.

Exemplo de tool para OpenCode:

```typescript
import { tool } from "@opencode-ai/plugin";
import { execSync } from "child_process";

export default tool({
  description: `Analisa dependências e impacto do projeto.

  COMANDOS:
  - map: Mapa do projeto
  - dead: Código morto
  - impact <arquivo>: Análise de impacto`,

  args: {
    command: tool.schema.enum(["map", "dead", "impact"]),
    target: tool.schema.string().optional(),
    format: tool.schema.enum(["text", "json"]).optional()
  },

  async execute({ command, target, format }) {
    const fmt = format || "text";
    const cmd = target
      ? `npx ai-tool ${command} "${target}" --format=${fmt}`
      : `npx ai-tool ${command} --format=${fmt}`;

    return execSync(cmd, { encoding: "utf-8" });
  }
});
```

## Requisitos

- Node.js >= 18.0.0
- TypeScript/JavaScript project

## Créditos

- [Skott](https://github.com/antoine-coulon/skott) - Análise de dependências
- [Knip](https://knip.dev) - Detecção de código morto

## Licença

MIT - [Koda AI Studio](https://kodaai.app)
