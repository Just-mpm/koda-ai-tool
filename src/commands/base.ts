/**
 * Commands Base Module
 *
 * Helpers compartilhados para todos os comandos do ai-tool.
 * Elimina duplicação de parsing de opções e formatação de output.
 */

import type { OutputFormat, CommandOptions } from "../types.js";

/**
 * Faz parsing padrão de opções de comando
 *
 * Fornece valores padrão para `cwd` e `format`, mantendo todas as outras
 * opções originais.
 *
 * @param options - Opções passadas ao comando
 * @returns Opções com valores padrão aplicados
 *
 * @example
 * ```typescript
 * const options = parseCommandOptions({ format: "json" });
 * // { cwd: "/current/dir", format: "json", save: undefined, cache: undefined }
 * ```
 */
export function parseCommandOptions<T extends CommandOptions>(
  options: T
): Required<Pick<CommandOptions, "cwd" | "format">> & T {
  return {
    cwd: options.cwd || process.cwd(),
    format: options.format || "text",
    ...options,
  };
}

/**
 * Formata output padrão (json ou text)
 *
 * Se o formato for "json", retorna o resultado como JSON stringificado.
 * Se for "text", usa o formatter fornecido e opcionalmente adiciona
 * um marcador de cache.
 *
 * @param result - Resultado a ser formatado
 * @param format - Formato de saída (json ou text)
 * @param textFormatter - Formatter para formato text
 * @param cacheMarker - Se true, adiciona marcador de cache ao final
 * @returns Resultado formatado como string
 *
 * @example
 * ```typescript
 * const result = { name: "test", count: 42 };
 *
 * // Formato JSON
 * formatOutput(result, "json", (data) => data.name);
 * // Retorna '{"name": "test", "count": 42}'
 *
 * // Formato text
 * formatOutput(result, "text", (data) => `${data.name}: ${data.count}`);
 * // Retorna "test: 42"
 *
 * // Com marcador de cache
 * formatOutput(result, "text", (data) => data.name, true);
 * // Retorna "test\n\n📦 (cache)"
 * ```
 */
export function formatOutput<T>(
  result: T,
  format: OutputFormat,
  textFormatter: (data: T) => string,
  cacheMarker?: boolean
): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }
  const output = textFormatter(result);
  return cacheMarker ? output + "\n\n📦 (cache)" : output;
}
