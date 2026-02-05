/**
 * TypeScript Utils Module
 *
 * Lógica compartilhada para manipulação de TypeScript AST com ts-morph.
 * Elimina duplicação entre extractor e indexer.
 */

/**
 * Simplifica tipos muito longos para melhor legibilidade
 *
 * Remove prefixes import(...) que ts-morph adiciona e trunca se > 80 chars.
 *
 * @param typeText - Texto do tipo a ser simplificado
 * @returns Tipo simplificado ou "unknown" se vazio/falsy
 *
 * @example
 * ```typescript
 * simplifyType("import(\"./types\").VeryLongTypeName")
 * // Retorna "VeryLongTypeName"
 * ```
 */
export function simplifyType(typeText: string): string {
  if (!typeText) return "unknown";
  let simplified = typeText.replace(/import\([^)]+\)\./g, "");
  if (simplified.length > 80) {
    simplified = simplified.slice(0, 77) + "...";
  }
  return simplified;
}

/**
 * Obtém texto do tipo de forma segura (evita erro de escapedName)
 *
 * @param getTypeFn - Função que retorna o tipo
 * @returns Texto do tipo ou "unknown" em caso de erro
 *
 * @example
 * ```typescript
 * const prop = someInterface.getProperties()[0];
 * const typeText = safeGetTypeText(() => prop.getType());
 * // Retorna o tipo ou "unknown" em caso de erro
 * ```
 */
export function safeGetTypeText(
  getTypeFn: () => { getText(): string }
): string {
  try {
    const type = getTypeFn();
    if (!type) return "unknown";
    return type.getText();
  } catch {
    return "unknown";
  }
}

/**
 * Formata definição de interface de forma legível
 *
 * Mostra cláusulas extends, propriedades (limitadas a 10) e métodos.
 *
 * @param iface - Interface ts-morph com métodos getProperties, getMethods e getExtends
 * @returns Definição formatada da interface
 *
 * @example
 * ```typescript
 * const formatted = formatInterfaceDefinition(interfaceNode);
 * // Retorna "{ extends Base; name: string; age: number; }"
 * ```
 */
export function formatInterfaceDefinition(iface: {
  getProperties(): { getName(): string; getType(): { getText(): string } }[];
  getMethods?(): { getName(): string; getReturnType(): { getText(): string } }[];
  getExtends(): { getText(): string }[];
}): string {
  const parts: string[] = [];

  // Herança
  const extendsClauses = iface.getExtends();
  if (extendsClauses.length > 0) {
    parts.push(
      `extends ${extendsClauses.map((e) => e.getText()).join(", ")}`
    );
  }

  // Propriedades (limitadas a 10)
  const props = iface.getProperties();
  for (const prop of props.slice(0, 10)) {
    const propType = simplifyType(safeGetTypeText(() => prop.getType()));
    parts.push(`${prop.getName()}: ${propType}`);
  }

  if (props.length > 10) {
    parts.push(`... +${props.length - 10} props`);
  }

  // Métodos (se disponível)
  if (iface.getMethods) {
    const methods = iface.getMethods();
    for (const method of methods) {
      const returnType = simplifyType(
        safeGetTypeText(() => method.getReturnType())
      );
      parts.push(`${method.getName()}(): ${returnType}`);
    }
  }

  return parts.length > 0 ? `{ ${parts.join("; ")} }` : "{}";
}
