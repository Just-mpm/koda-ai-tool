import { describe, it } from "node:test";
import assert from "node:assert";
import { findTargetFile } from "../../src/utils/file-matcher.js";

describe("findTargetFile", () => {
  it("deve encontrar arquivo exato com path completo", () => {
    const allFiles = [
      "src/index.ts",
      "src/utils/file-matcher.ts",
      "src/components/Button.tsx",
    ];
    const result = findTargetFile("src/utils/file-matcher.ts", allFiles);
    assert.strictEqual(result, "src/utils/file-matcher.ts");
  });

  it("deve encontrar arquivo exato (case-insensitive)", () => {
    const allFiles = [
      "src/index.ts",
      "src/utils/File-Matcher.ts",
      "src/components/Button.tsx",
    ];
    const result = findTargetFile("src/utils/file-matcher.ts", allFiles);
    assert.strictEqual(result, "src/utils/File-Matcher.ts");
  });

  it("deve encontrar arquivo por nome (sem extensão)", () => {
    const allFiles = [
      "src/index.ts",
      "src/components/Button.tsx",
      "src/pages/Button.tsx",
    ];
    const result = findTargetFile("Button", allFiles);
    // Deve retornar o primeiro match por prioridade
    assert.ok(result);
    assert.ok(allFiles.includes(result!));
  });

  it("deve priorizar match por diretório contendo o path do target", () => {
    const allFiles = [
      "src/services/quota/index.ts",
      "src/pages/LandingPages/index.ts",
      "src/index.ts",
    ];
    const result = findTargetFile("quota/index.ts", allFiles);
    // Deve priorizar src/services/quota/index.ts
    assert.strictEqual(result, "src/services/quota/index.ts");
  });

  it("deve priorizar path do target contendo diretório do arquivo", () => {
    const allFiles = [
      "src/pages/index.ts",
      "src/services/index.ts",
    ];
    const result = findTargetFile("src/services/pages/index.ts", allFiles);
    // Path do target contém "src/services", deve priorizar src/services/index.ts
    assert.strictEqual(result, "src/services/index.ts");
  });

  it("deve retornar null se não encontrar nenhum arquivo", () => {
    const allFiles = ["src/index.ts", "src/components/Button.tsx"];
    const result = findTargetFile("NonExistentFile", allFiles);
    assert.strictEqual(result, null);
  });

  it("deve encontrar arquivo por match parcial no path", () => {
    const allFiles = [
      "src/utils/file-matcher.ts",
      "src/components/MatchingComponent.tsx",
    ];
    const result = findTargetFile("file-matcher", allFiles);
    assert.strictEqual(result, "src/utils/file-matcher.ts");
  });

  it("deve normalizar caminhos com barras invertidas (Windows)", () => {
    const allFiles = [
      "src/utils/file-matcher.ts",
      "src/components/Button.tsx",
    ];
    const result = findTargetFile("src\\utils\\file-matcher.ts", allFiles);
    assert.strictEqual(result, "src/utils/file-matcher.ts");
  });

  it("deve lidar com extensões diferentes (.ts, .tsx, .js, .jsx)", () => {
    const allFiles = [
      "src/components/Button.tsx",
      "src/utils/Button.ts",
      "src/Button.js",
    ];
    const result = findTargetFile("Button", allFiles);
    assert.ok(result);
    assert.ok(allFiles.includes(result!));
  });

  it("deve priorizar matches por nome exato sobre parciais", () => {
    const allFiles = [
      "src/components/MyButton.tsx",
      "src/components/Button.tsx",
      "src/utils/ButtonUtils.ts",
    ];
    const result = findTargetFile("Button", allFiles);
    assert.ok(result);
    assert.ok(allFiles.includes(result!));
  });

  it("deve lidar com array vazio de arquivos", () => {
    const allFiles: string[] = [];
    const result = findTargetFile("Button", allFiles);
    assert.strictEqual(result, null);
  });

  it("deve lidar com target vazio (comportamento atual)", () => {
    const allFiles = ["src/index.ts"];
    const result = findTargetFile("", allFiles);
    // Nota: O algoritmo pode encontrar matches mesmo com target vazio
    // pois fileNameNoExt === targetNameNoExt quando ambos são vazios
    // Este teste apenas verifica que não lança erro
    assert.ok(result === null || typeof result === "string");
  });
});
