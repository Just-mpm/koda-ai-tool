# Ajustes para ai-tool v0.9.0 e v0.9.1

## Novidades do ai-tool

### v0.9.0
- **Comando `describe`**: Busca áreas por keywords em linguagem natural com correções via Levenshtein
  - Ex: `npx ai-tool describe "autenticação"` → encontra área de autenticação
  - Correções automáticas: "autenticacao" → "autenticação"

- **Integração Git**: Comando `impact` agora mostra últimos commits do arquivo
  - Novo campo em `ImpactResult.gitHistory`
  - Funções: `getCommitsForFile()`, `getBlameInfo()`, `hasGitRepo()`

- **Testes inteligentes**: Comando `suggest` agora inclui sugestões de testes
  - Novo campo em `SuggestResult.testSuggestions`

### v0.9.1
- **Bug fix**: Comando `describe` não estava exposto no CLI (corrigido)

---

## MCP Tools do ai-tool

### Tools existentes (já documentadas em AGENTS.md):
- `aitool_project_map`
- `aitool_dead_code`
- `aitool_impact_analysis`
- `aitool_suggest_reads`
- `aitool_file_context`
- `aitool_list_areas`
- `aitool_area_detail`
- `aitool_areas_init`
- `aitool_area_context`
- `aitool_find`
- `aitool_list_functions`

### **NOVA TOOL** (v0.9.0):
- **`aitool_describe`** - Busca áreas por descrição em linguagem natural
  - Use para: "onde implementou login?", "qual área cuida de pagamentos?"
  - Correções automáticas via Levenshtein
  - Sugestões quando não encontra

---

## Ajustes Necessários

### 1. fix-worker.md (agent)

**Arquivo**: `C:\Users\tetu_\.config\opencode\agent\fix-worker.md`

**Seção**: MCP Analyze (Use Antes de Modificar)

**Adicionar** na lista de ferramentas:

```markdown
### Para buscar áreas por descrição em linguagem natural:

- `analyze_aitool_describe { query: "autenticacao" }` → busca áreas por keywords
- Use quando precisar encontrar qual área implementa uma funcionalidade específica
- Ex: "onde implementou login?", "qual área cuida de pagamentos?"
```

**Modificar** a seção "Antes de editar qualquer arquivo":

```markdown
### Antes de editar qualquer arquivo:

- `analyze_aitool_impact_analysis { target: "arquivo.tsx" }` → mostra quem usa esse arquivo, riscos de mudança E histórico de commits Git
  - NOVO: `gitHistory` mostra últimos commits do arquivo (útil para entender contexto das mudanças)
- `analyze_aitool_suggest_reads { target: "arquivo.tsx" }` → lista arquivos para ler (tipos, dependências E testes relacionados)
  - NOVO: `testSuggestions` sugere testes baseados em arquivos afetados
```

**Modificar** o workflow recomendado antes de cada correção:

```markdown
### Workflow recomendado antes de cada correção:

1. `area_context { area: "area-do-finding" }` → entender contexto completo
2. `find { query: "simbolo-que-vai-mudar", refs: true }` → ver impacto da mudança
3. `impact_analysis { target: "arquivo" }` → confirmar riscos E ver histórico de commits
4. Se muitas referências ou risco alto → classificar como 🔴 RISCO
```

---

### 2. relay-worker.md (agent)

**Arquivo**: `C:\Users\tetu_\.config\opencode\agent\relay-worker.md`

**Adicionar** na seção "Tool Analyze (Economia de Contexto)":

```markdown
### Para buscar áreas por descrição em linguagem natural:

- `analyze_aitool_describe { query: "autenticacao" }` → busca áreas por keywords
- Use quando precisar encontrar qual área implementa uma funcionalidade específica
```

**Modificar** a seção "Antes de modificar um arquivo":

```markdown
### Antes de modificar um arquivo:

- `analyze_aitool_suggest_reads { target: "arquivo" }` → o que ler antes (inclui testSuggestions)
- `analyze_aitool_impact_analysis { target: "arquivo" }` → quem será afetado E histórico de commits
```

---

### 3. scan-gaps.md (agent) - AMBOS os locais

**Arquivos**:
- `C:\Users\tetu_\.config\opencode\agent\scan-gaps.md`
- `C:\Users\tetu_\.claude\agents\scan-gaps.md`

**Adicionar** na seção "MCP Analyze (Ferramentas Obrigatórias)":

```markdown
### Para buscar áreas por descrição em linguagem natural:

- `analyze_aitool_describe { query: "pagamentos" }` → busca áreas por keywords
- Útil quando não sabe o ID da área mas conhece a funcionalidade
```

**Adicionar** na lista de comandos no início do scan:

```markdown
### No início do scan:

1. `analyze_aitool_project_map` → entender estrutura geral e áreas
2. `analyze_aitool_list_areas` → ver todas as áreas funcionais
3. `analyze_aitool_describe { query: "dominio" }` → buscar áreas específicas por descrição
4. `analyze_aitool_dead_code` → encontrar arquivos órfãos e exports não usados
```

---

### 4. scan-validator.md (agent)

**Arquivo**: `C:\Users\tetu_\.config\opencode\agent\scan-validator.md`

**Adicionar** na seção "MCP Analyze (Validação Rápida)":

```markdown
### Para buscar áreas por descrição:

- `analyze_aitool_describe { query: "autenticacao" }` → encontrar área rapidamente
- Use quando precisa encontrar área sem saber o ID exato
```

---

### 5. fix.md (command orquestrador)

**Arquivo**: `C:\Users\tetu_\.config\opencode\command\fix.md`

**Adicionar** na Fase 2 (Agrupar por Área):

```markdown
### Lógica de agrupamento — Opcional: usar `describe` para buscar áreas

Se os caminhos dos arquivos não forem óbvios para categorização manual:
- Use `analyze_aitool_describe { query: "palavra-chave" }` para encontrar áreas relacionadas
- Ex: `describe "pagamentos"` → retorna área "billing"
```

---

### 6. fill.md (command orquestrador)

**Arquivo**: `C:\Users\tetu_\.config\opencode\command\fill.md`

**Adicionar** na Fase 2 (Agrupar por Área):

```markdown
### Lógica de agrupamento — Opcional: usar `describe` para buscar áreas

Se os caminhos dos arquivos não forem óbvios para categorização manual:
- Use `analyze_aitool_describe { query: "palavra-chave" }` para encontrar áreas relacionadas
- Ex: `describe "autenticacao"` → retorna área "auth"
```

---

### 7. ui.md (command)

**Arquivo**: `C:\Users\tetu_\.config\opencode\command\ui.md`

**Adicionar** na seção "1️⃣ Entender o Contexto":

```markdown
**Se usuário passou descrição escrita:**
- Confirme se é para criar do zero ou melhorar algo existente
- Se for melhorar, use `analyze_aitool_describe { query: "componente" }` para buscar áreas relacionadas
- Use `Glob` + `Grep` para encontrar componentes similares
- Leia componentes de referência no projeto para seguir padrões existentes

**Se usuário passou @path/Component.tsx:**
- Use `Read` para ler o componente existente
- Use `analyze_aitool_suggest_reads { target: "Component.tsx" }` → contexto necessário E testSuggestions
- Analise o código: estrutura, estilos, props, responsividade
- Identifique pontos de melhoria visual e de UX
```

**Adicionar** na seção "3️⃣ Implementar ou Melhorar":

```markdown
**Melhorar existente:**
- Use `Edit` para modificar arquivos
- Preserve lógica funcional (apenas melhore visual/UX)
- Adicione comentários explicando mudanças críticas
- Não quebre funcionalidades existentes

**Se necessário entender dependências:**
- Use `analyze_aitool_suggest_reads { target: "arquivo" }` → ver o que ler antes
  - Inclui `testSuggestions` para testes relacionados ao componente
```

---

### 8. scan.md (command orquestrador)

**Arquivo**: `C:\Users\tetu_\.config\opencode\command\scan.md`

**Adicionar** na Fase 1 (Reconhecimento):

```markdown
<fase_1_reconhecimento>
Use `analyze_aitool_project_map` para mapear o escopo de forma rápida e estruturada:

- Estrutura de pastas e arquivos
- Stack identificado
- Áreas/domínios do projeto

**Complemento opcional:** Se precisar encontrar áreas específicas:
- Use `analyze_aitool_describe { query: "dominio" }` → busca áreas por descrição
- Ex: `describe "autenticacao"` → encontra área de autenticação

Se o argumento estiver vazio, o escopo é o projeto inteiro. Se houver argumento, é a pasta ou área especificada.

**Complemento opcional:** Se precisar de contexto adicional (entender padrões incomuns, investigar dependências específicas), use Agent Explore como complemento.
</fase_1_reconhecimento>
```

---

### 9. validate.md (command)

**Arquivo**: `C:\Users\tetu_\.config\opencode\command\validate.md`

**Adicionar** na Fase 2 (Processar cada Quest), subseção "2.2 Investigar no código":

```markdown
### 2.2 Investigar no código

1. Localize o arquivo/componente mencionado em "Onde"
2. Leia o arquivo completo com `Read`
3. Entenda o contexto ao redor do trecho relevante
4. **Use `analyze_aitool_impact_analysis { target: "arquivo" }` para:**
   - Ver quem usa esse arquivo
   - Ver riscos de mudança
   - **NOVO: Ver histórico de commits em `gitHistory`** - útil para entender quando o código mudou pela última vez
5. Analise:
   - **O comportamento descrito é realmente um bug?** Ou é o comportamento esperado?
   - **O código tem o problema descrito?** Ou o teste interpretou errado?
   - **A severidade faz sentido?**
   - **Existe uma causa raiz clara?**
```

---

## Resumo das Mudanças

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| fix-worker.md | Agent | Adicionar `describe`, documentar `gitHistory` do impact, documentar `testSuggestions` do suggest |
| relay-worker.md | Agent | Adicionar `describe`, documentar `gitHistory` do impact |
| scan-gaps.md (x2) | Agent | Adicionar `describe` ao início do scan |
| scan-validator.md | Agent | Adicionar `describe` para busca rápida |
| fix.md | Command | Adicionar `describe` opcional para agrupamento |
| fill.md | Command | Adicionar `describe` opcional para agrupamento |
| ui.md | Command | Adicionar `describe` e `suggest_reads` com testSuggestions |
| scan.md | Command | Adicionar `describe` na fase de reconhecimento |
| validate.md | Command | Adicionar `impact_analysis` com `gitHistory` para investigação |

---

## Novas Funcionalidades Disponíveis

### 1. `aitool_describe` - Busca áreas por descrição

```bash
# MCP
analyze_aitool_describe { query: "autenticacao" }

# CLI
ai-tool describe "autenticação"
```

**Quando usar:**
- Você sabe a funcionalidade ("login", "pagamentos") mas não sabe a área exata
- Precisa encontrar área rapidamente sem ler IDs

**Funcionalidades:**
- Correções automáticas via Levenshtein
- Sugestões quando não encontra
- Aceita descrição em linguagem natural

### 2. `aitool_impact_analysis` - Histórico Git

```bash
# MCP
analyze_aitool_impact_analysis { target: "arquivo.tsx" }

# Retorna
{
  upstream: [...],
  downstream: [...],
  gitHistory: [  // NOVO
    { hash: "abc123", author: "Matheus", date: "2025-02-05", message: "Fix login" }
  ]
}
```

**Quando usar:**
- Antes de modificar um arquivo para entender contexto das mudanças
- Investigar bugs para ver quem modificou por último

### 3. `aitool_suggest_reads` - Sugestões de testes

```bash
# MCP
analyze_aitool_suggest_reads { target: "arquivo.tsx" }

# Retorna
{
  critical: [...],
  high: [...],
  medium: [...],
  low: [...],
  testSuggestions: [  // NOVO
    { file: "arquivo.test.ts", reason: "Componente testado" },
    { file: "arquivo.spec.ts", reason: "Hook customizado" }
  ]
}
```

**Quando usar:**
- Antes de criar testes para ver se já existem
- Para entender padrões de testes do projeto

---

## Prioridade das Mudanças

### 🔴 ALTA (Implementar imediatamente)
1. **fix-worker.md** - Agent de execução muito usado
2. **relay-worker.md** - Agent de execução muito usado
3. **ui.md** - Command muito usado

### 🟡 MÉDIA (Implementar em breve)
4. **scan-gaps.md** (ambos) - Agent de análise
5. **scan-validator.md** - Agent de validação
6. **validate.md** - Command de investigação de bugs

### 🟢 BAIXA (Implementar quando possível)
7. **fix.md** - Orquestrador
8. **fill.md** - Orquestrador
9. **scan.md** - Orquestrador

---

## Checklist de Implementação

- [ ] Atualizar fix-worker.md
- [ ] Atualizar relay-worker.md
- [ ] Atualizar C:\Users\tetu_\.config\opencode\agent\scan-gaps.md
- [ ] Atualizar C:\Users\tetu_\.claude\agents\scan-gaps.md
- [ ] Atualizar scan-validator.md
- [ ] Atualizar fix.md
- [ ] Atualizar fill.md
- [ ] Atualizar ui.md
- [ ] Atualizar scan.md
- [ ] Atualizar validate.md
- [ ] Testar agents com as novas funcionalidades
- [ ] Atualizar AGENTS.md com a nova tool `aitool_describe`
