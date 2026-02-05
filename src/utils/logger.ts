/**
 * Logger condicional para debug messages
 *
 * Ativado via environment variables: DEBUG_ANALYZE, DEBUG_FUNCTIONS
 *
 * @example
 * ```typescript
 * import { logger } from "./logger.js";
 *
 * // Log de debug geral
 * logger.debug("Indexando projeto:", cwd);
 *
 * // Log específico para Cloud Functions
 * logger.debugFunctions("Trigger detectado:", triggerName);
 * ```
 */

/**
 * Logger condicional para debug messages
 *
 * Fornece métodos de logging que só produzem output quando
 * as variáveis de ambiente correspondentes estão definidas.
 *
 * Variáveis de ambiente:
 * - `DEBUG_ANALYZE=true` - Ativa todos os logs de debug
 * - `DEBUG_FUNCTIONS=true` - Ativa logs específicos de Cloud Functions
 */
export class Logger {
  /** Flag de debug geral - ativada via DEBUG_ANALYZE=true */
  private readonly _debug = process.env.DEBUG_ANALYZE === "true";

  /** Flag de debug para Cloud Functions - ativada via DEBUG_FUNCTIONS=true ou DEBUG_ANALYZE=true */
  private readonly _debugFunctions = process.env.DEBUG_FUNCTIONS === "true" || this._debug;

  /**
   * Log de debug geral
   *
   * Só produz output quando DEBUG_ANALYZE=true
   *
   * @param args - Argumentos para log (qualquer tipo)
   * @example
   * logger.debug("Indexando", files.length, "arquivos");
   */
  debug(...args: unknown[]): void {
    if (this._debug) {
      console.error("[analyze:debug]", ...args);
    }
  }

  /**
   * Log de debug para Cloud Functions
   *
   * Só produz output quando DEBUG_FUNCTIONS=true ou DEBUG_ANALYZE=true
   *
   * @param args - Argumentos para log (qualquer tipo)
   * @example
   * logger.debugFunctions("Trigger detectado:", triggerName);
   */
  debugFunctions(...args: unknown[]): void {
    if (this._debugFunctions) {
      console.error("[functions:debug]", ...args);
    }
  }
}

/**
 * Instância singleton do logger
 *
 * Use esta instância em todo o código ao invés de criar novas instâncias.
 */
export const logger = new Logger();
