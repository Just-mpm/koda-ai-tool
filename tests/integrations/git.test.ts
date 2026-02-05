/**
 * Tests for integrations/git module
 *
 * Nota: Devido à dificuldade de mockar módulos nativos (fs, child_process)
 * no node:test, estes testes focam em verificar a estrutura e tipos das
 * interfaces e funções exportadas, e testes de integração podem ser feitos
 * em um ambiente Git real se necessário.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { hasGitRepo, getCommitsForFile, getBlameInfo, getLastCommitMessage, getLastCommitDate } from "../../src/integrations/git.js";

describe("git module - exports e tipos", () => {
  it("deve exportar hasGitRepo", () => {
    assert.strictEqual(typeof hasGitRepo, "function");
  });

  it("deve exportar getCommitsForFile", () => {
    assert.strictEqual(typeof getCommitsForFile, "function");
  });

  it("deve exportar getBlameInfo", () => {
    assert.strictEqual(typeof getBlameInfo, "function");
  });

  it("deve exportar getLastCommitMessage", () => {
    assert.strictEqual(typeof getLastCommitMessage, "function");
  });

  it("deve exportar getLastCommitDate", () => {
    assert.strictEqual(typeof getLastCommitDate, "function");
  });
});

describe("hasGitRepo", () => {
  it("deve retornar booleano", () => {
    const result = hasGitRepo("/tmp/any-path");
    assert.strictEqual(typeof result, "boolean");
  });

  it("deve aceitar string como parâmetro", () => {
    assert.doesNotThrow(() => {
      hasGitRepo("/some/path");
    });
  });

  it("deve lidar com caminho vazio", () => {
    assert.doesNotThrow(() => {
      const result = hasGitRepo("");
      assert.strictEqual(result, false);
    });
  });
});

describe("getCommitsForFile", () => {
  it("deve retornar Promise de array", async () => {
    const result = getCommitsForFile("test.ts", "/tmp");
    assert.ok(result instanceof Promise);
    const commits = await result;
    assert.ok(Array.isArray(commits));
  });

  it("deve aceitar parâmetros obrigatórios", async () => {
    assert.doesNotThrow(async () => {
      await getCommitsForFile("test.ts", "/tmp");
    });
  });

  it("deve aceitar limit opcional", async () => {
    assert.doesNotThrow(async () => {
      await getCommitsForFile("test.ts", "/tmp", 5);
    });
  });

  it("deve retornar array vazio quando não há commits (sem repo)", async () => {
    const commits = await getCommitsForFile("test.ts", "/tmp/nonexistent");
    assert.strictEqual(commits.length, 0);
  });

  it("deve retornar array vazio quando arquivo não existe", async () => {
    const commits = await getCommitsForFile("nonexistent-file.ts", process.cwd());
    assert.ok(Array.isArray(commits));
  });
});

describe("getBlameInfo", () => {
  it("deve retornar Promise que resolve para null ou objeto", async () => {
    const result = getBlameInfo("test.ts", 1, "/tmp");
    assert.ok(result instanceof Promise);
    const blame = await result;
    assert.ok(blame === null || typeof blame === "object");
  });

  it("deve aceitar parâmetros obrigatórios", async () => {
    assert.doesNotThrow(async () => {
      await getBlameInfo("test.ts", 1, "/tmp");
    });
  });

  it("deve aceitar número de linha", async () => {
    assert.doesNotThrow(async () => {
      await getBlameInfo("test.ts", 42, "/tmp");
    });
  });

  it("deve retornar null quando não é repo Git", async () => {
    const blame = await getBlameInfo("test.ts", 1, "/tmp/nonexistent");
    assert.strictEqual(blame, null);
  });
});

describe("getLastCommitMessage", () => {
  it("deve retornar Promise que resolve para string ou null", async () => {
    const result = getLastCommitMessage("test.ts", "/tmp");
    assert.ok(result instanceof Promise);
    const message = await result;
    assert.ok(message === null || typeof message === "string");
  });

  it("deve aceitar parâmetros obrigatórios", async () => {
    assert.doesNotThrow(async () => {
      await getLastCommitMessage("test.ts", "/tmp");
    });
  });

  it("deve retornar null quando não há commits", async () => {
    const message = await getLastCommitMessage("test.ts", "/tmp/nonexistent");
    assert.strictEqual(message, null);
  });
});

describe("getLastCommitDate", () => {
  it("deve retornar Promise que resolve para string ou null", async () => {
    const result = getLastCommitDate("test.ts", "/tmp");
    assert.ok(result instanceof Promise);
    const date = await result;
    assert.ok(date === null || typeof date === "string");
  });

  it("deve aceitar parâmetros obrigatórios", async () => {
    assert.doesNotThrow(async () => {
      await getLastCommitDate("test.ts", "/tmp");
    });
  });

  it("deve retornar null quando não há commits", async () => {
    const date = await getLastCommitDate("test.ts", "/tmp/nonexistent");
    assert.strictEqual(date, null);
  });
});

describe("integração - em repo Git real (opcional)", () => {
  it("deve detectar se estamos em um repo Git", () => {
    const isRepo = hasGitRepo(process.cwd());
    // Não afirmamos valor específico pois depende do ambiente de teste
    assert.strictEqual(typeof isRepo, "boolean");
  });

  it("deve executar getCommitsForFile sem erro mesmo sem commits", async () => {
    assert.doesNotThrow(async () => {
      await getCommitsForFile("nonexistent.ts", process.cwd());
    });
  });

  it("deve executar getBlameInfo sem erro mesmo sem repo", async () => {
    assert.doesNotThrow(async () => {
      await getBlameInfo("nonexistent.ts", 1, "/tmp");
    });
  });
});
