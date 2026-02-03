/**
 * Comando AREAS INIT - Gera configuração inicial de áreas
 *
 * Cria um arquivo de configuração com template completo
 * que o usuário pode customizar manualmente
 */

import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import type { AreasConfigFile } from "../types.js";
import { writeConfig, configExists } from "../areas/config.js";

/**
 * Extensões de código suportadas
 */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

/**
 * Pastas a ignorar
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".cache",
  "coverage",
  ".turbo",
  ".vercel",
  ".analyze",
]);

interface InitOptions {
  cwd?: string;
  force?: boolean;
}

/**
 * Template de configuração inicial com áreas comuns
 */
function createInitialConfig(files: string[]): AreasConfigFile {
  // Detectar padrões de ignore sugeridos
  const suggestedIgnore = detectSuggestedIgnorePatterns(files);

  // Detectar framework usado
  const framework = detectFramework(files);

  return {
    $schema: "./areas.schema.json",
    version: "1.0.0",
    ignore: suggestedIgnore,
    areas: getFrameworkAreas(framework),
    descriptions: {},
    settings: {
      autoDetect: false,
      inferDescriptions: true,
      groupByCategory: true,
    },
  };
}

/**
 * Detecta o framework baseado na estrutura de pastas
 */
function detectFramework(files: string[]): string {
  const hasAppDir = files.some(f => f.startsWith("app/"));
  const hasPagesDir = files.some(f => f.startsWith("pages/"));
  const hasSrcDir = files.some(f => f.startsWith("src/"));

  if (hasAppDir) return "nextjs-app";
  if (hasPagesDir) return "nextjs-pages";
  if (hasSrcDir) return "vite";
  return "generic";
}

/**
 * Retorna áreas sugeridas baseadas no framework
 */
function getFrameworkAreas(framework: string): Record<string, any> {
  switch (framework) {
    case "nextjs-app":
      return {
        auth: {
          name: "Autenticação",
          description: "Login, signup e gerenciamento de sessão",
          patterns: [
            "app/**/auth/**",
            "app/**/login/**",
            "app/**/signup/**",
            "app/**/cadastro/**",
            "components/auth/**",
          ],
          keywords: ["auth", "login", "signup", "signin"],
        },
        dashboard: {
          name: "Dashboard",
          description: "Painel principal do usuário",
          patterns: ["app/**/dashboard/**", "components/dashboard/**"],
          keywords: ["dashboard"],
        },
        admin: {
          name: "Administração",
          description: "Painel administrativo",
          patterns: ["app/**/admin/**", "components/admin/**"],
          keywords: ["admin"],
        },
        profile: {
          name: "Perfil",
          description: "Perfil e configurações do usuário",
          patterns: ["app/**/profile/**", "app/**/perfil/**", "app/**/settings/**", "app/**/configuracoes/**"],
          keywords: ["profile", "perfil", "settings", "configuracoes"],
        },
        billing: {
          name: "Pagamentos",
          description: "Sistema de pagamentos e assinaturas",
          patterns: ["components/stripe/**", "components/payment/**", "lib/stripe/**"],
          keywords: ["stripe", "payment", "billing", "subscription", "checkout"],
        },
        checkout: {
          name: "Checkout",
          description: "Fluxo de checkout e finalização de compra",
          patterns: ["app/**/checkout/**", "components/checkout/**"],
          keywords: ["checkout"],
        },
        "shared-ui": {
          name: "UI Compartilhada",
          description: "Componentes de UI reutilizáveis (botões, inputs, etc)",
          patterns: ["components/ui/**", "components/common/**", "components/shared/**"],
          keywords: [],
        },
        api: {
          name: "API Routes",
          description: "Rotas de API do Next.js",
          patterns: ["app/**/api/**"],
          keywords: ["api"],
        },
      };

    case "nextjs-pages":
      return {
        auth: {
          name: "Autenticação",
          description: "Login, signup e gerenciamento de sessão",
          patterns: [
            "pages/**/auth/**",
            "pages/**/login/**",
            "pages/**/signup/**",
            "components/auth/**",
          ],
          keywords: ["auth", "login", "signup"],
        },
        dashboard: {
          name: "Dashboard",
          description: "Painel principal do usuário",
          patterns: ["pages/**/dashboard/**", "components/dashboard/**"],
          keywords: ["dashboard"],
        },
        api: {
          name: "API Routes",
          description: "Rotas de API do Next.js (pages/api)",
          patterns: ["pages/api/**"],
          keywords: ["api"],
        },
        "shared-ui": {
          name: "UI Compartilhada",
          description: "Componentes de UI reutilizáveis",
          patterns: ["components/ui/**", "components/common/**"],
          keywords: [],
        },
      };

    case "vite":
      return {
        auth: {
          name: "Autenticação",
          description: "Login, signup e gerenciamento de sessão",
          patterns: ["src/pages/**/auth/**", "src/pages/**/login/**", "components/auth/**"],
          keywords: ["auth", "login", "signup"],
        },
        dashboard: {
          name: "Dashboard",
          description: "Painel principal do usuário",
          patterns: ["src/pages/**/dashboard/**", "components/dashboard/**"],
          keywords: ["dashboard"],
        },
        "shared-ui": {
          name: "UI Compartilhada",
          description: "Componentes de UI reutilizáveis",
          patterns: ["components/ui/**", "components/common/**"],
          keywords: [],
        },
      };

    default:
      // Generic - template mínimo
      return {
        auth: {
          name: "Autenticação",
          description: "Login e sessão",
          patterns: ["**/auth/**", "**/login/**"],
          keywords: ["auth", "login"],
        },
        "shared-ui": {
          name: "UI Compartilhada",
          description: "Componentes reutilizáveis",
          patterns: ["components/ui/**", "components/common/**"],
          keywords: [],
        },
      };
  }
}

/**
 * Executa o comando AREAS INIT
 */
export async function areasInit(options: InitOptions = {}): Promise<string> {
  const cwd = options.cwd || process.cwd();
  const force = options.force ?? false;

  try {
    // 1. Verificar se já existe configuração
    if (configExists(cwd) && !force) {
      return `
⚠️ Arquivo de configuração já existe: .analyze/areas.config.json

Use --force para sobrescrever:
  ai-tool areas init --force

Ou edite manualmente o arquivo existente.
`.trim();
    }

    // 2. Listar todos os arquivos
    const allFiles = getAllCodeFiles(cwd);

    // 3. Criar configuração inicial com template
    const newConfig = createInitialConfig(allFiles);

    // 4. Salvar configuração
    writeConfig(cwd, newConfig);

    // 5. Detectar framework
    const framework = detectFramework(allFiles);
    const frameworkName = {
      "nextjs-app": "Next.js (App Router)",
      "nextjs-pages": "Next.js (Pages Router)",
      "vite": "Vite/CRA",
      "generic": "Genérico",
    }[framework] || framework;

    // 6. Contar áreas criadas
    const areasCount = Object.keys(newConfig.areas).length;

    // 7. Montar output
    let out = `
✅ Arquivo criado: .analyze/areas.config.json

🎯 Framework detectado: ${frameworkName}
📦 Áreas configuradas: ${areasCount}
`;

    // Mostrar padrões de ignore se houver
    if (newConfig.ignore && newConfig.ignore.length > 0) {
      out += `🚫 Padrões ignorados: ${newConfig.ignore.length}\n`;
    }

    out += `
📝 Próximos passos:

1️⃣ Personalize as áreas:
   Edite .analyze/areas.config.json e ajuste:
   - Adicione suas áreas de negócio (ex: "pets", "veterinary", "activities")
   - Ajuste os padrões (patterns) para cada área
   - Renomeie áreas conforme seu domínio

2️⃣ Adicione descrições (opcional):
   "descriptions": {
     "src/hooks/useAuth.ts": "Hook principal de autenticação",
     "src/services/petService.ts": "Serviço de gerenciamento de pets"
   }

3️⃣ Valide a configuração:
   ai-tool areas              # Ver todas as áreas
   ai-tool area auth          # Ver arquivos de uma área
   ai-tool map                # Ver resumo do projeto

💡 Dicas:

• Use patterns para pastas: "app/dashboard/**"
• Use keywords para arquivos espalhados: ["auth", "login"]
• Um arquivo pode pertencer a múltiplas áreas
• Use "exclude" para remover arquivos específicos de uma área

📖 Exemplo completo:

{
  "areas": {
    "meus-pets": {
      "name": "Meus Pets",
      "description": "Listagem e gerenciamento de pets do usuário",
      "patterns": [
        "app/meus-pets/**",
        "components/pets/**",
        "hooks/usePets.*",
        "services/petService.*"
      ],
      "keywords": ["pet", "animal"],
      "exclude": ["components/pets/shared/**"] // opcional
    },
    "auth": {
      "name": "Autenticação",
      "patterns": ["app/**/auth/**", "components/auth/**"],
      "keywords": ["auth", "login"]
    }
  }
}
`;

    return out.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao executar areas init: ${message}`);
  }
}

/**
 * Detecta padrões sugeridos para ignore baseado nos arquivos do projeto
 */
function detectSuggestedIgnorePatterns(files: string[]): string[] {
  const patterns: string[] = [];

  // Padrões básicos sempre incluídos
  patterns.push("node_modules/**");

  // Verificar functions/lib/
  if (files.some((f) => f.includes("functions/lib/"))) {
    patterns.push("functions/lib/**");
  }

  // Verificar arquivos de teste
  const testCount = files.filter(
    (f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f)
  ).length;
  if (testCount > 3) {
    patterns.push("**/*.test.{ts,tsx,js,jsx}");
    patterns.push("**/*.spec.{ts,tsx,js,jsx}");
  }

  // Verificar arquivos .d.ts
  const dtsCount = files.filter((f) => f.endsWith(".d.ts")).length;
  if (dtsCount > 2) {
    patterns.push("**/*.d.ts");
  }

  // Verificar configurações
  const configCount = files.filter((f) =>
    /\.(config|conf)\.(ts|js|mjs|cjs)$/.test(f)
  ).length;
  if (configCount > 2) {
    patterns.push("**/*.config.{ts,js,mjs,cjs}");
  }

  return patterns;
}

/**
 * Lista todos os arquivos de código do projeto recursivamente
 */
function getAllCodeFiles(dir: string, files: string[] = [], baseDir: string = dir): string[] {
  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      // Ignorar pastas não relevantes
      if (IGNORED_DIRS.has(entry) || entry.startsWith(".")) {
        continue;
      }

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          getAllCodeFiles(fullPath, files, baseDir);
        } else {
          const ext = extname(entry).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            // Caminho relativo ao baseDir
            // Adiciona 1 para remover a barra separadora
            const relativePath = fullPath.slice(baseDir.length + 1).replace(/\\/g, "/");
            // Verificação de segurança: ignora se o caminho relativo for vazio ou começar com ..
            if (relativePath && !relativePath.startsWith("..")) {
              files.push(relativePath);
            }
          }
        }
      } catch {
        // Ignorar arquivos inacessíveis
      }
    }
  } catch {
    // Ignorar diretórios inacessíveis
  }

  return files;
}
