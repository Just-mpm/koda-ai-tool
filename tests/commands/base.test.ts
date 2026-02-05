/**
 * Tests for commands/base module
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { parseCommandOptions, formatOutput } from "../../src/commands/base.js";

describe("parseCommandOptions", () => {
  it("deve fornecer cwd padrão (process.cwd())", () => {
    const options = {};
    const result = parseCommandOptions(options);
    assert.strictEqual(result.cwd, process.cwd());
  });

  it("deve fornecer format padrão 'text'", () => {
    const options = {};
    const result = parseCommandOptions(options);
    assert.strictEqual(result.format, "text");
  });

  it("deve usar cwd fornecido", () => {
    const customCwd = "/custom/path";
    const options = { cwd: customCwd };
    const result = parseCommandOptions(options);
    assert.strictEqual(result.cwd, customCwd);
  });

  it("deve usar format fornecido", () => {
    const options = { format: "json" as const };
    const result = parseCommandOptions(options);
    assert.strictEqual(result.format, "json");
  });

  it("deve preservar outras opções", () => {
    const options = { customOption: "value", save: true, cache: false };
    const result = parseCommandOptions(options);
    assert.strictEqual((result as typeof options).customOption, "value");
    assert.strictEqual((result as typeof options).save, true);
    assert.strictEqual((result as typeof options).cache, false);
  });

  it("deve sobrescrever cwd padrão quando fornecido", () => {
    const customCwd = "/another/path";
    const options = { cwd: customCwd };
    const result = parseCommandOptions(options);
    assert.strictEqual(result.cwd, customCwd);
    assert.notStrictEqual(result.cwd, process.cwd());
  });

  it("deve lidar com format 'text' explícito", () => {
    const options = { format: "text" as const };
    const result = parseCommandOptions(options);
    assert.strictEqual(result.format, "text");
  });

  it("deve retornar tipo correto com TypeScript", () => {
    const options = { cwd: "/test", format: "json" as const };
    const result = parseCommandOptions(options);
    assert.strictEqual(typeof result.cwd, "string");
    assert.strictEqual(typeof result.format, "string");
  });
});

describe("formatOutput", () => {
  it("deve formatar como JSON quando format='json'", () => {
    const result = { name: "test", count: 42 };
    const formatter = () => "formatted text";
    const output = formatOutput(result, "json", formatter);
    assert.strictEqual(output, JSON.stringify(result, null, 2));
  });

  it("deve formatar como texto quando format='text'", () => {
    const result = { name: "test", count: 42 };
    const formatter = (data: typeof result) => `${data.name}: ${data.count}`;
    const output = formatOutput(result, "text", formatter);
    assert.strictEqual(output, "test: 42");
  });

  it("deve adicionar marcador de cache quando cacheMarker=true", () => {
    const result = { name: "test" };
    const formatter = () => "test output";
    const output = formatOutput(result, "text", formatter, true);
    assert.strictEqual(output, "test output\n\n📦 (cache)");
  });

  it("deve ignorar cacheMarker quando format='json'", () => {
    const result = { name: "test" };
    const formatter = () => "test output";
    const output = formatOutput(result, "json", formatter, true);
    assert.strictEqual(output, JSON.stringify(result, null, 2));
    assert.ok(!output.includes("📦 (cache)"));
  });

  it("deve não adicionar marcador de cache quando cacheMarker=false/undefined", () => {
    const result = { name: "test" };
    const formatter = () => "test output";
    const output1 = formatOutput(result, "text", formatter, false);
    const output2 = formatOutput(result, "text", formatter);
    assert.strictEqual(output1, "test output");
    assert.strictEqual(output2, "test output");
  });

  it("deve formatar objetos complexos como JSON", () => {
    const result = {
      nested: { data: { items: [1, 2, 3] } },
      count: 10,
    };
    const formatter = () => "text";
    const output = formatOutput(result, "json", formatter);
    const parsed = JSON.parse(output);
    assert.deepStrictEqual(parsed, result);
  });

  it("deve usar formatter customizado para texto", () => {
    const result = { items: ["a", "b", "c"] };
    const formatter = (data: typeof result) => data.items.join(", ");
    const output = formatOutput(result, "text", formatter);
    assert.strictEqual(output, "a, b, c");
  });

  it("deve lidar com resultado vazio", () => {
    const result = {};
    const formatter = () => "empty";
    const output = formatOutput(result, "json", formatter);
    assert.strictEqual(output, JSON.stringify({}, null, 2));
  });

  it("deve lidar com string vazia do formatter", () => {
    const result = {};
    const formatter = () => "";
    const output = formatOutput(result, "text", formatter, true);
    assert.strictEqual(output, "\n\n📦 (cache)");
  });

  it("deve preservar JSON formatting com espaços", () => {
    const result = { a: 1, b: 2 };
    const formatter = () => "text";
    const output = formatOutput(result, "json", formatter);
    assert.ok(output.includes("\n"));
    assert.ok(output.includes("  "));
  });
});
