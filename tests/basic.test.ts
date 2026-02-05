import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createTempDir, cleanupTempDir, createMockProjectFiles } from "./setup.js";

describe("Basic tests", () => {
  let tempDir: string;

  before(async () => {
    tempDir = await createTempDir();
  });

  after(async () => {
    await cleanupTempDir(tempDir);
  });

  it("should pass basic assertion", () => {
    assert.strictEqual(1 + 1, 2);
  });

  it("should create temporary directory", async () => {
    const dir = await createTempDir();
    assert.ok(dir);
    assert.ok(dir.length > 0);
    await cleanupTempDir(dir);
  });

  it("should create mock project files", async () => {
    await createMockProjectFiles(tempDir);

    // Verificar que os arquivos foram criados
    const pkgJsonPath = join(tempDir, "package.json");
    const tsConfigPath = join(tempDir, "tsconfig.json");
    const indexPath = join(tempDir, "src", "index.ts");
    const buttonPath = join(tempDir, "src", "components", "Button.tsx");

    const [pkgJson, tsConfig, index, button] = await Promise.all([
      fs.readFile(pkgJsonPath, "utf-8"),
      fs.readFile(tsConfigPath, "utf-8"),
      fs.readFile(indexPath, "utf-8"),
      fs.readFile(buttonPath, "utf-8"),
    ]);

    assert.ok(pkgJson.includes("mock-project"));
    assert.ok(tsConfig.includes("compilerOptions"));
    assert.ok(index.includes("Button"));
    assert.ok(button.includes("ButtonProps"));
  });

  it("should create all mock files", async () => {
    await createMockProjectFiles(tempDir);

    const files = [
      "package.json",
      "tsconfig.json",
      "src/index.ts",
      "src/components/Button.tsx",
      "src/hooks/useAuth.ts",
      "src/services/authService.ts",
      "src/utils/dead.ts",
    ];

    for (const file of files) {
      const exists = await fs
        .access(join(tempDir, file))
        .then(() => true)
        .catch(() => false);
      assert.ok(exists, `Expected file ${file} to exist`);
    }
  });

  it("should cleanup temporary directory", async () => {
    const dir = await createTempDir();
    const testFile = join(dir, "test.txt");
    await fs.writeFile(testFile, "test content");

    // Verificar que arquivo existe
    await fs.access(testFile);

    // Cleanup
    await cleanupTempDir(dir);

    // Verificar que arquivo não existe mais (lança erro)
    await assert.rejects(async () => {
      await fs.access(testFile);
    });
  });
});
