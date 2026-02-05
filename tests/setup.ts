/**
 * Helpers comuns para testes
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cria um diretório temporário único
 */
export async function createTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `ai-tool-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Remove um diretório temporário recursivamente
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Silenciar erros de cleanup - o diretório pode já ter sido removido
  }
}

/**
 * Cria arquivos mock de um projeto TypeScript básico
 */
export async function createMockProjectFiles(dir: string): Promise<void> {
  // package.json básico
  await fs.writeFile(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "mock-project",
        version: "1.0.0",
        type: "module",
        main: "dist/index.js",
        scripts: {
          build: "tsc"
        },
        dependencies: {
          "lodash": "^4.17.21"
        }
      },
      null,
      2
    )
  );

  // tsconfig.json
  await fs.writeFile(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          moduleResolution: "bundler",
          outDir: "./dist",
          rootDir: "./src",
          declaration: true,
          strict: true,
          esModuleInterop: true
        },
        include: ["src/**/*"]
      },
      null,
      2
    )
  );

  // Criar estrutura de diretórios
  await fs.mkdir(join(dir, "src"), { recursive: true });
  await fs.mkdir(join(dir, "src/components"), { recursive: true });
  await fs.mkdir(join(dir, "src/hooks"), { recursive: true });
  await fs.mkdir(join(dir, "src/services"), { recursive: true });
  await fs.mkdir(join(dir, "src/utils"), { recursive: true });

  // Arquivos principais
  await fs.writeFile(
    join(dir, "src/index.ts"),
    `export { Button } from "./components/Button.js";
export { useAuth } from "./hooks/useAuth.js";
export { authService } from "./services/authService.js";`
  );

  // Componente Button
  await fs.writeFile(
    join(dir, "src/components/Button.tsx"),
    `import React from "react";

interface ButtonProps {
  label: string;
  onClick?: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}`
  );

  // Hook useAuth
  await fs.writeFile(
    join(dir, "src/hooks/useAuth.ts"),
    `export function useAuth() {
  const user = { id: "1", name: "Test User" };
  const isAuthenticated = true;

  return { user, isAuthenticated };
}`
  );

  // Serviço authService
  await fs.writeFile(
    join(dir, "src/services/authService.ts"),
    `import { isEmpty } from "lodash";

export class AuthService {
  async login(email: string, password: string): Promise<{ user: { id: string; name: string } }> {
    if (isEmpty(email) || isEmpty(password)) {
      throw new Error("Invalid credentials");
    }
    return { user: { id: "1", name: "Test User" } };
  }

  async logout(): Promise<void> {
    // Simula logout
  }
}

export const authService = new AuthService();`
  );

  // Utilitório não usado (código morto)
  await fs.writeFile(
    join(dir, "src/utils/dead.ts"),
    `// Este arquivo não é usado em nenhum lugar
export function deadFunction() {
  console.log("This is dead code");
}

export const DEAD_CONSTANT = "never used";`
  );
}

/**
 * Cria um arquivo TypeScript simples em um diretório
 */
export async function createTestFile(dir: string, name: string, content: string): Promise<void> {
  await fs.mkdir(join(dir, "src"), { recursive: true });
  await fs.writeFile(join(dir, "src", name), content, "utf-8");
}
