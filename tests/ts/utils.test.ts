/**
 * Tests for ts/utils module
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { simplifyType, safeGetTypeText, formatInterfaceDefinition } from "../../src/ts/utils.js";

describe("simplifyType", () => {
  it("deve retornar 'unknown' para valor vazio", () => {
    assert.strictEqual(simplifyType(""), "unknown");
    assert.strictEqual(simplifyType(undefined as unknown as string), "unknown");
  });

  it("deve remover prefixos import(...)", () => {
    const result = simplifyType('import("./types").UserType');
    assert.strictEqual(result, "UserType");
  });

  it("deve remover múltiplos prefixos import(...)", () => {
    const result = simplifyType('import("./types").UserType & import("./other").OtherType');
    assert.strictEqual(result, "UserType & OtherType");
  });

  it("deve truncar tipos muito longos (>80 caracteres)", () => {
    const longType = "VeryLongTypeName".repeat(20);
    const result = simplifyType(longType);
    assert.ok(result.length <= 80);
    assert.ok(result.endsWith("..."));
  });

  it("deve manter tipos curtos sem truncamento", () => {
    const shortType = "UserType";
    const result = simplifyType(shortType);
    assert.strictEqual(result, shortType);
  });

  it("deve remover prefixos import e truncar se necessário", () => {
    const longType = 'import("./types").' + "VeryLongTypeName".repeat(20);
    const result = simplifyType(longType);
    assert.ok(result.length <= 80);
    assert.ok(result.endsWith("..."));
  });
});

describe("safeGetTypeText", () => {
  it("deve retornar texto do tipo corretamente", () => {
    const mockType = { getText: () => "string" };
    const result = safeGetTypeText(() => mockType);
    assert.strictEqual(result, "string");
  });

  it("deve retornar 'unknown' se getTypeFn retornar null/undefined", () => {
    const result = safeGetTypeText(() => null as unknown as { getText(): string });
    assert.strictEqual(result, "unknown");
  });

  it("deve retornar 'unknown' se getText lançar erro", () => {
    const mockType = {
      getText: () => {
        throw new Error("Simulated error");
      },
    };
    const result = safeGetTypeText(() => mockType);
    assert.strictEqual(result, "unknown");
  });

  it("deve retornar 'unknown' se getTypeFn lançar erro", () => {
    const getTypeFn = () => {
      throw new Error("Simulated error");
    };
    const result = safeGetTypeText(getTypeFn);
    assert.strictEqual(result, "unknown");
  });

  it("deve lidar com tipos complexos", () => {
    const mockType = { getText: () => "Array<{ name: string; age: number }>" };
    const result = safeGetTypeText(() => mockType);
    assert.strictEqual(result, "Array<{ name: string; age: number }>");
  });
});

describe("formatInterfaceDefinition", () => {
  it("deve formatar interface vazia", () => {
    const iface = {
      getProperties: () => [],
      getExtends: () => [],
    };
    const result = formatInterfaceDefinition(iface);
    assert.strictEqual(result, "{}");
  });

  it("deve incluir cláusula extends", () => {
    const iface = {
      getProperties: () => [],
      getExtends: () => [{ getText: () => "BaseType" }],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("extends BaseType"));
  });

  it("deve incluir múltiplas cláusulas extends", () => {
    const iface = {
      getProperties: () => [],
      getExtends: () => [
        { getText: () => "BaseType1" },
        { getText: () => "BaseType2" },
      ],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("extends BaseType1, BaseType2"));
  });

  it("deve incluir propriedades", () => {
    const iface = {
      getProperties: () => [
        { getName: () => "name", getType: () => ({ getText: () => "string" }) },
        { getName: () => "age", getType: () => ({ getText: () => "number" }) },
      ],
      getExtends: () => [],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("name: string"));
    assert.ok(result.includes("age: number"));
  });

  it("deve simplificar tipos de propriedades", () => {
    const iface = {
      getProperties: () => [
        {
          getName: () => "user",
          getType: () => ({ getText: () => 'import("./types").User' }),
        },
      ],
      getExtends: () => [],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("user: User"));
    assert.ok(!result.includes("import"));
  });

  it("deve limitar propriedades a 10", () => {
    const properties = Array.from({ length: 15 }, (_, i) => ({
      getName: () => `prop${i}`,
      getType: () => ({ getText: () => "string" }),
    }));

    const iface = {
      getProperties: () => properties,
      getExtends: () => [],
    };

    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("prop0: string"));
    assert.ok(result.includes("prop9: string"));
    assert.ok(result.includes("... +5 props"));
    assert.ok(!result.includes("prop10: string"));
  });

  it("deve incluir métodos se disponível", () => {
    const iface = {
      getProperties: () => [],
      getExtends: () => [],
      getMethods: () => [
        { getName: () => "getName", getReturnType: () => ({ getText: () => "string" }) },
        { getName: () => "getAge", getReturnType: () => ({ getText: () => "number" }) },
      ],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("getName(): string"));
    assert.ok(result.includes("getAge(): number"));
  });

  it("deve simplificar tipos de retorno de métodos", () => {
    const iface = {
      getProperties: () => [],
      getExtends: () => [],
      getMethods: () => [
        {
          getName: () => "getData",
          getReturnType: () => ({ getText: () => 'import("./types").ComplexType' }),
        },
      ],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("getData(): ComplexType"));
    assert.ok(!result.includes("import"));
  });

  it("deve combinar extends, propriedades e métodos", () => {
    const iface = {
      getProperties: () => [
        { getName: () => "name", getType: () => ({ getText: () => "string" }) },
      ],
      getExtends: () => [{ getText: () => "BaseType" }],
      getMethods: () => [
        { getName: () => "save", getReturnType: () => ({ getText: () => "void" }) },
      ],
    };
    const result = formatInterfaceDefinition(iface);
    assert.ok(result.includes("extends BaseType"));
    assert.ok(result.includes("name: string"));
    assert.ok(result.includes("save(): void"));
  });
});
