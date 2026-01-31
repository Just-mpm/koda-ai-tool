# Plano de Implementação: Sistema de Áreas/Domínios

> **Objetivo:** Substituir documentação manual de estrutura por detecção automática + configuração editável de áreas funcionais do projeto.

---

## 🎯 Problema que Resolve

Hoje o ai-tool oferece:
- `map` → lista arquivos por **categoria técnica** (hook, component, page...)
- `impact` → mostra **dependências** de um arquivo
- `suggest` → sugere arquivos para ler

**O que falta:**
- Visão por **domínio funcional** ("pets", "auth", "stripe", "notifications")
- Listar **todos os arquivos de uma área** de uma vez
- Entender **o que cada arquivo faz** (não só a categoria)

---

## 📁 Estrutura de Arquivos

```
.analyze/
├── meta.json          # (já existe) Hash dos arquivos
├── graph.json         # (já existe) Grafo de dependências
├── map.json           # (já existe) Cache do map
├── dead.json          # (já existe) Cache do dead
├── areas.json         # (NOVO) Áreas detectadas automaticamente
└── areas.config.json  # (NOVO) Configuração manual do usuário ⭐
```

### `areas.config.json` - Editável pelo usuário

```json
{
  "$schema": "./areas.schema.json",
  "version": "1.0.0",

  "areas": {
    "meus-pets": {
      "name": "Meus Pets",
      "description": "Gerenciamento completo de pets do usuário",
      "patterns": [
        "app/**/meus-pets/**",
        "components/pets/**",
        "hooks/usePets.ts",
        "store/petsStore.ts",
        "lib/firebase/firestore/pets.ts",
        "schemas/petSchemas.ts",
        "types/pet.types.ts"
      ],
      "keywords": ["pet", "vaccination", "deworming", "medication"],
      "exclude": []
    },

    "firebase-core": {
      "name": "Firebase Core",
      "description": "Configuração e serviços Firebase client-side",
      "patterns": [
        "lib/firebase/**"
      ],
      "exclude": [
        "lib/firebase/ai/**",
        "lib/firebase/aiExtraction/**"
      ]
    },

    "stripe": {
      "name": "Sistema de Assinatura",
      "description": "Integração Stripe + gerenciamento de assinaturas",
      "patterns": [
        "app/**/assinatura/**",
        "lib/stripe/**",
        "hooks/useSubscription.ts"
      ],
      "keywords": ["stripe", "subscription", "payment", "checkout"]
    }
  },

  "descriptions": {
    "components/pets/PetForm/PetForm.tsx": "Controller do formulário multi-step",
    "components/pets/PetCard/AnimatedPetCard.tsx": "Card de pet com animação",
    "lib/firebase/firestore/pets.ts": "CRUD de pets no Firestore"
  },

  "settings": {
    "autoDetect": true,
    "inferDescriptions": true,
    "groupByCategory": true
  }
}
```

### `areas.json` - Gerado automaticamente (cache)

```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-31T...",
  "detectedAreas": {
    "meus-pets": {
      "files": ["app/.../page.tsx", "components/pets/..."],
      "fileCount": 43,
      "categories": { "page": 4, "component": 28, "hook": 6 }
    }
  },
  "fileToArea": {
    "components/pets/PetForm/PetForm.tsx": "meus-pets",
    "lib/firebase/config.ts": "firebase-core"
  }
}
```

---

## 🔧 Novos Comandos

### 1. `ai-tool areas` - Lista todas as áreas

```bash
$ ai-tool areas

📦 Áreas do Projeto (12 detectadas)

  meus-pets          43 arquivos   Gerenciamento de pets
  firebase-core      28 arquivos   Configuração Firebase
  auth               15 arquivos   Autenticação
  stripe             12 arquivos   Sistema de assinatura
  notifications       9 arquivos   Sistema de notificações
  health-tracking    34 arquivos   Acompanhamento de saúde
  training           21 arquivos   Sistema de adestramento
  i18n                8 arquivos   Internacionalização
  admin              11 arquivos   Painel administrativo
  seo                 6 arquivos   SEO e meta tags
  pwa                 4 arquivos   Progressive Web App
  shared             52 arquivos   Componentes compartilhados

Use: ai-tool area <nome> para ver detalhes
```

### 2. `ai-tool area <nome>` - Detalhe de uma área

```bash
$ ai-tool area meus-pets

📦 Área: Meus Pets
   Gerenciamento completo de pets do usuário

📊 Resumo: 43 arquivos
   📄 page: 4  🧩 component: 28  🪝 hook: 6  🗄️ store: 1  📝 type: 2  🔧 util: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 PAGES (4)
   app/[locale]/(app)/meus-pets/page.tsx              Lista de pets
   app/[locale]/(app)/meus-pets/[id]/page.tsx         Detalhe do pet
   app/[locale]/(app)/meus-pets/novo/page.tsx         Cadastro novo pet
   app/[locale]/(app)/meus-pets/[id]/editar/page.tsx  Edição do pet

🧩 COMPONENTS (28)
   components/pets/PetForm/PetForm.tsx                Controller formulário
   components/pets/PetForm/steps/BasicInfoStep.tsx    Step 1: Info básica
   components/pets/PetCard/AnimatedPetCard.tsx        Card animado
   components/pets/PetPhotoUpload/PetPhotoUpload.tsx  Upload de foto
   ... (24 mais)

🪝 HOOKS (6)
   hooks/usePets.ts                                   Store de pets
   components/pets/PetForm/hooks/usePetFormSubmit.ts  Hook de submit
   ... (4 mais)

💡 Dica: Use --full para ver todos os arquivos
```

### 3. `ai-tool area <nome> --type <categoria>`

```bash
$ ai-tool area meus-pets --type hook

📦 Área: Meus Pets → Hooks (6)

   hooks/usePets.ts                                    Store de pets
   hooks/useHealthRecordTab.ts                         Tab de registros
   components/pets/PetForm/hooks/usePetFormSubmit.ts   Hook de submit
   components/pets/PetForm/hooks/usePetFormNavigation.ts  Navegação do form
   components/pets/PetForm/hooks/usePetFormAccessibility.ts  A11y
   components/pets/MedicationManager/hooks/useMedicationCRUD.ts  CRUD medicamentos
```

### 4. `ai-tool areas init` - Gera configuração inicial

```bash
$ ai-tool areas init

✅ Arquivo criado: .analyze/areas.config.json

Detectamos 12 áreas automaticamente baseado em:
  - Estrutura de pastas
  - Padrões de nome
  - Grafo de dependências

Edite o arquivo para:
  - Renomear áreas
  - Adicionar descrições
  - Ajustar agrupamentos
  - Excluir falsos positivos
```

### 5. `ai-tool areas sync` - Sincroniza config com detecção

```bash
$ ai-tool areas sync

🔄 Sincronizando áreas...

Novas áreas detectadas:
  + beta-program (4 arquivos)

Arquivos sem área:
  - utils/formatters.ts
  - components/ui/LoadingButton.tsx

Sugestão: Adicione ao "shared" ou crie nova área

✅ Cache atualizado: .analyze/areas.json
```

---

## 🧠 Algoritmo de Detecção Automática

### Fase 1: Detecção por Padrões de Pasta

```typescript
const AREA_PATTERNS = {
  // App Router - detecta por rota
  'app/**/meus-pets/**': 'meus-pets',
  'app/**/consultas/**': 'consultas-ia',
  'app/**/dashboard/**': 'dashboard',
  'app/**/admin/**': 'admin',
  'app/**/assinatura/**': 'stripe',
  'app/**/guias/**': 'training',
  'app/**/auth/**': 'auth',
  'app/**/login/**': 'auth',
  'app/**/cadastro/**': 'auth',

  // Componentes - detecta por subpasta
  'components/pets/**': 'meus-pets',
  'components/consultation/**': 'consultas-ia',
  'components/training/**': 'training',
  'components/health/**': 'health-tracking',
  'components/auth/**': 'auth',
  'components/admin/**': 'admin',
  'components/landing/**': 'landing',
  'components/providers/**': 'core',
  'components/ui/**': 'shared',
  'components/common/**': 'shared',

  // Lib - detecta por módulo
  'lib/firebase/**': 'firebase-core',
  'lib/stripe/**': 'stripe',
  'lib/i18n/**': 'i18n',

  // Cloud Functions
  'functions/src/**': 'cloud-functions',
};
```

### Fase 2: Detecção por Keywords no Nome

```typescript
const KEYWORD_AREAS = {
  'pet': 'meus-pets',
  'vaccination': 'meus-pets',
  'deworming': 'meus-pets',
  'medication': 'meus-pets',
  'consultation': 'consultas-ia',
  'training': 'training',
  'health': 'health-tracking',
  'stripe': 'stripe',
  'subscription': 'stripe',
  'auth': 'auth',
  'login': 'auth',
  'notification': 'notifications',
  'fcm': 'notifications',
  'i18n': 'i18n',
  'locale': 'i18n',
  'seo': 'seo',
  'meta': 'seo',
};
```

### Fase 3: Clustering por Dependências

Arquivos que se importam muito entre si = mesma área (usando grafo do Skott).

```typescript
// Se A importa B e B importa A (ou muitos em comum)
// E ambos não têm área definida → criar cluster
function clusterByDependencies(graph: Graph) {
  // Usar algoritmo de community detection
  // Ex: Louvain, Label Propagation
}
```

### Fase 4: Inferência de Descrições

```typescript
// 1. JSDoc do arquivo
// 2. Nome do export default
// 3. Primeira linha de comentário
// 4. Fallback: categoria + nome do arquivo

function inferDescription(file: string, sourceFile: SourceFile): string {
  // Tentar JSDoc
  const jsdoc = getFileJSDoc(sourceFile);
  if (jsdoc) return jsdoc;

  // Tentar comentário no topo
  const topComment = getTopComment(sourceFile);
  if (topComment) return topComment;

  // Gerar do nome
  return generateFromName(file); // "PetForm.tsx" → "Formulário de pet"
}
```

---

## 📋 Tipos TypeScript

```typescript
// src/types.ts (adicionar)

export interface AreaConfig {
  name: string;
  description?: string;
  patterns: string[];
  keywords?: string[];
  exclude?: string[];
}

export interface AreasConfigFile {
  $schema?: string;
  version: string;
  areas: Record<string, AreaConfig>;
  descriptions?: Record<string, string>;  // path → descrição manual
  settings?: {
    autoDetect?: boolean;      // default: true
    inferDescriptions?: boolean; // default: true
    groupByCategory?: boolean;   // default: true
  };
}

export interface DetectedArea {
  id: string;
  name: string;
  description?: string;
  files: AreaFile[];
  fileCount: number;
  categories: Partial<Record<FileCategory, number>>;
  isAutoDetected: boolean;
}

export interface AreaFile {
  path: string;
  category: FileCategory;
  description?: string;
}

export interface AreasResult {
  version: string;
  timestamp: string;
  areas: DetectedArea[];
  unmapped: string[];  // arquivos sem área
}

export interface AreaDetailResult {
  version: string;
  timestamp: string;
  area: DetectedArea;
  byCategory: Record<FileCategory, AreaFile[]>;
}

export interface AreasOptions extends CommandOptions {
  full?: boolean;      // mostrar todos os arquivos
  type?: FileCategory; // filtrar por categoria
}
```

---

## 🗂️ Estrutura de Arquivos (Implementação)

```
src/
├── commands/
│   ├── areas.ts          # NOVO - Lista áreas
│   ├── area.ts           # NOVO - Detalhe de área
│   ├── areas-init.ts     # NOVO - Gera config inicial
│   └── areas-sync.ts     # NOVO - Sincroniza cache
├── areas/
│   ├── detector.ts       # NOVO - Detecção automática
│   ├── config.ts         # NOVO - Lê/escreve config
│   ├── matcher.ts        # NOVO - Match arquivo → área
│   ├── clusterer.ts      # NOVO - Clustering por deps
│   └── describer.ts      # NOVO - Inferência de descrições
├── formatters/
│   └── text.ts           # Adicionar formatadores de área
└── types.ts              # Adicionar tipos de área
```

---

## 🚀 Fases de Implementação

### Fase 1: MVP (Detecção Básica)
- [ ] Tipos TypeScript
- [ ] `detector.ts` - detecção por padrões de pasta
- [ ] `config.ts` - leitura do areas.config.json
- [ ] `matcher.ts` - match simples arquivo → área
- [ ] Comando `areas` - lista todas
- [ ] Comando `area <nome>` - detalhe básico
- [ ] Formatador text para áreas

### Fase 2: Configuração
- [ ] Comando `areas init` - gera config inicial
- [ ] Validação do config com JSON Schema
- [ ] Merge de config manual + detecção auto
- [ ] Flag `--type` para filtrar por categoria

### Fase 3: Inteligência
- [ ] Detecção por keywords no nome
- [ ] Clustering por dependências (usar grafo do Skott)
- [ ] Inferência de descrições (JSDoc, comentários)
- [ ] Comando `areas sync` - atualiza cache

### Fase 4: MCP + Polish
- [ ] Tool MCP `aitool_list_areas`
- [ ] Tool MCP `aitool_area_detail`
- [ ] Cache de áreas (invalidar quando arquivos mudam)
- [ ] Output JSON para todas as operações
- [ ] Documentação e exemplos

---

## 🎨 Exemplos de Uso Real

### Cenário 1: Início de Sessão
```bash
# Agente quer entender o projeto
$ ai-tool map      # visão geral
$ ai-tool areas    # áreas funcionais

# Usuário pede: "quero trabalhar na área de pets"
$ ai-tool area meus-pets
$ ai-tool area meus-pets --type hook  # só os hooks
```

### Cenário 2: Antes de Modificar
```bash
# Usuário: "vou mexer no PetForm"
$ ai-tool suggest PetForm           # arquivos relacionados
$ ai-tool area meus-pets --type type  # tipos da área
$ ai-tool context PetForm           # assinaturas do arquivo
```

### Cenário 3: Documentação do Projeto
```bash
# Gerar documentação automática
$ ai-tool areas --format json > docs/areas.json

# Ou usar no CI para validar que nenhum arquivo ficou sem área
$ ai-tool areas sync --check  # falha se há arquivos sem área
```

---

## ❓ Decisões Pendentes

1. **Nome do comando**: `area` vs `domain` vs `feature`?
   - Sugestão: `area` (mais genérico)

2. **Persistir descrições inferidas?**
   - Sim, no `areas.json` (cache)
   - Usuário pode sobrescrever no `areas.config.json`

3. **Arquivo de config dentro de `.analyze/` ou na raiz?**
   - Sugestão: `.analyze/areas.config.json`
   - Motivo: Mantém tudo junto, `.analyze/` já está no .gitignore de muitos projetos
   - Alternativa: Se quiser versionar, pode ser `areas.config.json` na raiz

4. **Fallback para arquivos sem área?**
   - Área especial `_unmapped` ou `shared`?
   - Sugestão: Mostrar como "sem área" e sugerir no `areas sync`

---

## 📝 Notas

- Manter compatibilidade com comandos existentes (map, dead, impact, suggest, context)
- Usar o grafo já cacheado pelo `map` para clustering
- Permitir que o mesmo arquivo pertença a múltiplas áreas? (acho que não, complica)
- Considerar suporte a monorepos no futuro (múltiplos `areas.config.json`)
