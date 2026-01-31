# ai-tool

Ferramenta de analise de dependencias e impacto para projetos TypeScript/JavaScript.

Usa [Skott](https://github.com/antoine-coulon/skott) + [Knip](https://knip.dev) + [ts-morph](https://ts-morph.com) internamente.

## Instalacao

```bash
# Via npx (sem instalar)
npx @justmpm/ai-tool map

# Ou instalar globalmente
npm install -g @justmpm/ai-tool

# Ou como devDependency
npm install -D @justmpm/ai-tool
```

## Comandos

### `map` - Mapa do Projeto

Gera um mapa completo do projeto com categorizacao de arquivos.

```bash
ai-tool map
ai-tool map --format=json
```

**Output:**
- Total de arquivos e pastas
- Categorizacao automatica (component, hook, service, util, etc.)
- Estrutura de pastas
- Dependencias circulares detectadas

### `dead` - Codigo Morto

Detecta arquivos, exports e dependencias nao utilizados.

```bash
ai-tool dead
ai-tool dead --format=json
ai-tool dead --fix  # Remove automaticamente
```

**Detecta:**
- Arquivos orfaos (ninguem importa)
- Exports nao utilizados
- Dependencias npm nao usadas

### `impact` - Analise de Impacto

Analisa o impacto de modificar um arquivo especifico.

```bash
ai-tool impact Button
ai-tool impact src/components/Button.tsx
ai-tool impact useAuth --format=json
```

**Output:**
- **Upstream**: Quem importa este arquivo (afetados por mudancas)
- **Downstream**: O que este arquivo importa (dependencias)
- **Riscos**: Arquivo critico, dependencias circulares, etc.
- **Sugestoes**: Recomendacoes para modificacao segura

### `suggest` - Sugestao de Leitura

Sugere arquivos para ler ANTES de modificar um arquivo.

```bash
ai-tool suggest Button
ai-tool suggest src/hooks/useAuth.ts --limit=5
```

**Prioridades:**
- **Critical**: Tipos/interfaces usados pelo arquivo
- **High**: Dependencias diretas (imports)
- **Medium**: Upstream (quem usa o arquivo)
- **Low**: Testes relacionados

### `context` - Contexto do Arquivo

Extrai assinaturas de funcoes e tipos SEM a implementacao.

```bash
ai-tool context Button
ai-tool context src/hooks/useAuth.ts --format=json
```

**Extrai:**
- Imports com specifiers
- Exports do arquivo
- Funcoes com parametros e tipos de retorno
- Interfaces, types e enums com definicoes

Ideal para entender rapidamente a API publica de um arquivo.

### `areas` - Areas/Dominios Funcionais

Lista todas as areas funcionais do projeto (auth, dashboard, stripe, etc).

```bash
ai-tool areas
ai-tool areas --format=json
```

**Output:**
- Lista de areas detectadas automaticamente
- Contagem de arquivos por area
- Distribuicao de categorias por area

### `area` - Detalhe de uma Area

Mostra todos os arquivos de uma area especifica.

```bash
ai-tool area auth
ai-tool area meus-pets --type=hook  # Filtra por categoria
ai-tool area stripe --full          # Mostra todos os arquivos
```

**Output:**
- Arquivos agrupados por categoria
- Descricao inferida de cada arquivo

### `areas init` - Configuracao de Areas

Gera arquivo de configuracao editavel para areas.

```bash
ai-tool areas init
ai-tool areas init --force  # Sobrescreve config existente
```

Cria `.analyze/areas.config.json` com:
- Areas detectadas automaticamente
- Patterns glob para cada area
- Keywords de deteccao
- Descricoes manuais de arquivos

## Servidor MCP

Integra com Claude Desktop e outras ferramentas MCP.

```bash
ai-tool --mcp
```

**Tools expostas:**
- `aitool_project_map` - Mapa do projeto
- `aitool_dead_code` - Codigo morto
- `aitool_impact_analysis` - Analise de impacto
- `aitool_suggest_reads` - Sugestao de leitura
- `aitool_file_context` - Contexto do arquivo
- `aitool_list_areas` - Lista areas funcionais
- `aitool_area_detail` - Detalhe de uma area
- `aitool_areas_init` - Gera config de areas

### Configuracao Claude Code

Adicione ao `.mcp.json` do projeto ou ao arquivo global `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "analyze": {
      "command": "npx",
      "args": ["-y", "@justmpm/ai-tool", "--mcp"]
    }
  }
}
```

### Configuracao Claude Desktop

Adicione ao `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "analyze": {
      "command": "npx",
      "args": ["-y", "@justmpm/ai-tool", "--mcp"]
    }
  }
}
```

## Uso Programatico

```typescript
import { map, dead, impact, suggest, context, areas, area, areasInit } from "@justmpm/ai-tool";

// Mapa do projeto
const projectMap = await map({ format: "json" });

// Codigo morto
const deadCode = await dead({ format: "json" });

// Analise de impacto
const analysis = await impact("Button", { format: "json" });

// Sugestao de leitura
const suggestions = await suggest("Button", { limit: 5 });

// Contexto do arquivo
const fileContext = await context("Button", { format: "json" });

// Areas funcionais
const projectAreas = await areas({ format: "json" });

// Detalhe de uma area
const authArea = await area("auth", { type: "hook" });

// Gerar config de areas
await areasInit({ force: false });
```

## Opcoes

| Opcao | Descricao | Default |
|-------|-----------|---------|
| `--format=text\|json` | Formato de saida | `text` |
| `--cwd=<path>` | Diretorio do projeto | `process.cwd()` |
| `--no-cache` | Ignora cache | `false` |
| `--fix` | Remove codigo morto (so `dead`) | `false` |
| `--limit=<n>` | Limite de sugestoes (so `suggest`) | `10` |
| `--mcp` | Inicia servidor MCP | - |

## Categorias de Arquivos

| Categoria | Descricao |
|-----------|-----------|
| `page` | Paginas (Next.js, etc.) |
| `layout` | Layouts |
| `route` | Rotas de API |
| `component` | Componentes React/Vue |
| `hook` | React Hooks |
| `service` | Servicos/API |
| `store` | Estado global |
| `util` | Utilitarios |
| `type` | Tipos TypeScript |
| `config` | Configuracoes |
| `test` | Testes |
| `other` | Outros |

## Cache

Resultados sao salvos em `.analyze/` para acelerar execucoes futuras.

- Cache e invalidado automaticamente quando arquivos mudam
- Use `--no-cache` para forcar regeneracao
- Adicione `.analyze/` ao `.gitignore`

## Requisitos

- Node.js >= 18.0.0
- Projeto TypeScript/JavaScript

## Creditos

- [Skott](https://github.com/antoine-coulon/skott) - Analise de dependencias
- [Knip](https://knip.dev) - Deteccao de codigo morto
- [ts-morph](https://ts-morph.com) - Analise AST

## Licenca

MIT - [Koda AI Studio](https://kodaai.app)
