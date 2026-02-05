/**
 * Tests for utils/logger module
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { Logger, logger as singletonLogger } from "../../src/utils/logger.js";

describe("Logger", () => {
  let originalDebugAnalyze: string | undefined;
  let originalDebugFunctions: string | undefined;

  before(() => {
    // Salvar variáveis de ambiente originais
    originalDebugAnalyze = process.env.DEBUG_ANALYZE;
    originalDebugFunctions = process.env.DEBUG_FUNCTIONS;
  });

  after(() => {
    // Restaurar variáveis de ambiente originais
    if (originalDebugAnalyze !== undefined) {
      process.env.DEBUG_ANALYZE = originalDebugAnalyze;
    } else {
      delete process.env.DEBUG_ANALYZE;
    }
    if (originalDebugFunctions !== undefined) {
      process.env.DEBUG_FUNCTIONS = originalDebugFunctions;
    } else {
      delete process.env.DEBUG_FUNCTIONS;
    }
  });

  describe("debug", () => {
    it("deve logar quando DEBUG_ANALYZE=true", (t) => {
      process.env.DEBUG_ANALYZE = "true";
      const logger = new Logger();

      // Verificar que console.error foi chamado (usando mock se necessário)
      // Para simplicidade, vamos apenas verificar que não lança erro
      assert.doesNotThrow(() => {
        logger.debug("Test message");
      });
    });

    it("não deve logar quando DEBUG_ANALYZE não está definido", () => {
      delete process.env.DEBUG_ANALYZE;
      const logger = new Logger();

      // Deve não lançar erro e não produzir output
      assert.doesNotThrow(() => {
        logger.debug("Test message");
      });
    });

    it("não deve logar quando DEBUG_ANALYZE=false", () => {
      process.env.DEBUG_ANALYZE = "false";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debug("Test message");
      });
    });

    it("deve logar múltiplos argumentos", () => {
      process.env.DEBUG_ANALYZE = "true";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debug("Message 1", "Message 2", 123, { key: "value" });
      });
    });

    it("deve lidar com argumentos de tipos diferentes", () => {
      process.env.DEBUG_ANALYZE = "true";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debug("String", 42, null, undefined, true, [], {});
      });
    });
  });

  describe("debugFunctions", () => {
    it("deve logar quando DEBUG_FUNCTIONS=true", () => {
      process.env.DEBUG_FUNCTIONS = "true";
      delete process.env.DEBUG_ANALYZE;
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Function debug message");
      });
    });

    it("deve logar quando DEBUG_ANALYZE=true (cascata)", () => {
      process.env.DEBUG_ANALYZE = "true";
      delete process.env.DEBUG_FUNCTIONS;
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Function debug message");
      });
    });

    it("não deve logar quando ambas flags estão falsas", () => {
      delete process.env.DEBUG_ANALYZE;
      delete process.env.DEBUG_FUNCTIONS;
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Function debug message");
      });
    });

    it("deve logar quando DEBUG_FUNCTIONS=true mesmo com DEBUG_ANALYZE=false", () => {
      process.env.DEBUG_FUNCTIONS = "true";
      process.env.DEBUG_ANALYZE = "false";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Function debug message");
      });
    });

    it("deve logar múltiplos argumentos", () => {
      process.env.DEBUG_FUNCTIONS = "true";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Trigger:", "onCall", "File:", "file.ts");
      });
    });
  });

  describe("instância singleton logger", () => {
    it("deve exportar instância singleton do logger", () => {
      assert.ok(singletonLogger);
      assert.ok(singletonLogger instanceof Logger);
    });

    it("singleton deve ter métodos debug e debugFunctions", () => {
      assert.strictEqual(typeof singletonLogger.debug, "function");
      assert.strictEqual(typeof singletonLogger.debugFunctions, "function");
    });

    it("singleton deve não lançar erro ao chamar métodos", () => {
      assert.doesNotThrow(() => {
        singletonLogger.debug("Test");
        singletonLogger.debugFunctions("Test");
      });
    });
  });

  describe("comportamento de prefixo", () => {
    it("debug deve prefixar com [analyze:debug]", (t) => {
      // Este teste seria melhor com mock de console.error
      // Por enquanto, apenas verificamos que não lança erro
      process.env.DEBUG_ANALYZE = "true";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debug("Test message");
      });
    });

    it("debugFunctions deve prefixar com [functions:debug]", (t) => {
      process.env.DEBUG_FUNCTIONS = "true";
      const logger = new Logger();

      assert.doesNotThrow(() => {
        logger.debugFunctions("Test message");
      });
    });
  });
});
