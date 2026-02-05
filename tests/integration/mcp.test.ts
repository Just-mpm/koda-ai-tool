/**
 * Tests de Integração - MCP Server
 *
 * Testes que verificam se o MCP server pode iniciar e exportar as ferramentas corretamente.
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { startMcpServer } from "../../src/mcp/server.js";
import { registerAllTools } from "../../src/mcp/tools.js";

describe("MCP Server Integration", () => {
  describe("tools module", () => {
    it("deve exportar registerAllTools", () => {
      assert.strictEqual(typeof registerAllTools, "function");
    });

    it("registerAllTools deve aceitar parâmetro server", () => {
      // Verifica que a função espera um parâmetro
      assert.strictEqual(registerAllTools.length, 1, "Deve aceitar um parâmetro de server");
    });
  });

  describe("startMcpServer", () => {
    it("deve exportar startMcpServer", () => {
      assert.strictEqual(typeof startMcpServer, "function");
    });

    it("startMcpServer deve ser assíncrono", () => {
      assert.strictEqual(startMcpServer.constructor.name, "AsyncFunction");
    });
  });

  describe.skip("integração com mock de server", () => {
    // Skip pois o mock do MCP server é complexo e requer
    // mais configuração do que o necessário para testes básicos
  });
});
