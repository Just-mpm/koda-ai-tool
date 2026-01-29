# ai-tool

Pacote npm para análise de dependências e código morto em projetos TS/JS.

## O que faz

- **`map`** - Gera mapa do projeto com categorização automática de arquivos
- **`dead`** - Detecta arquivos órfãos, exports não usados, deps npm mortas
- **`impact <arquivo>`** - Analisa upstream/downstream de um arquivo específico

## Stack interna

- [Skott](https://github.com/antoine-coulon/skott) - Análise de dependências
- [Knip](https://knip.dev) - Detecção de código morto

## Estrutura

```
src/           # Código fonte TypeScript
dist/          # Build compilado
```

## Comandos úteis

```bash
npm run build    # Compila TypeScript
npx ai-tool map  # Testa localmente
```

## Uso

```bash
npx ai-tool map              # Mapa do projeto
npx ai-tool dead             # Código morto
npx ai-tool dead --fix       # Remove código morto
npx ai-tool impact Button    # Impacto de mudança
```

Formato: `--format=text|json`
