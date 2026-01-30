/**
 * TypeScript AST Extractor - Extrai assinaturas de funcoes e tipos usando ts-morph
 */

import { Project, SourceFile, SyntaxKind, Node } from "ts-morph";
import type { FunctionInfo, TypeInfo, ImportInfo, ParamInfo } from "../types.js";

/**
 * Cria um projeto ts-morph configurado
 */
export function createProject(cwd: string): Project {
  return new Project({
    tsConfigFilePath: `${cwd}/tsconfig.json`,
    skipAddingFilesFromTsConfig: true,
  });
}

/**
 * Adiciona um arquivo ao projeto e retorna o SourceFile
 */
export function addSourceFile(project: Project, filePath: string): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

/**
 * Extrai informacoes de imports de um arquivo
 */
export function extractImports(sourceFile: SourceFile): ImportInfo[] {
  const imports: ImportInfo[] = [];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifiers: string[] = [];

    // Default import
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      specifiers.push(defaultImport.getText());
    }

    // Named imports
    for (const namedImport of importDecl.getNamedImports()) {
      const alias = namedImport.getAliasNode();
      if (alias) {
        specifiers.push(`${namedImport.getName()} as ${alias.getText()}`);
      } else {
        specifiers.push(namedImport.getName());
      }
    }

    // Namespace import
    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      specifiers.push(`* as ${namespaceImport.getText()}`);
    }

    imports.push({
      source: importDecl.getModuleSpecifierValue(),
      specifiers,
      isTypeOnly: importDecl.isTypeOnly(),
    });
  }

  return imports;
}

/**
 * Extrai a descricao do JSDoc de um node
 */
function getJsDocDescription(node: Node): string | undefined {
  const jsDocs = node.getChildrenOfKind(SyntaxKind.JSDoc);
  if (jsDocs.length === 0) return undefined;

  const firstJsDoc = jsDocs[0];
  const comment = firstJsDoc.getComment();

  if (typeof comment === "string") {
    return comment.trim() || undefined;
  }

  // Se for um array de JSDocText ou outros nodes, extrair texto
  if (Array.isArray(comment)) {
    const text = comment
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((c) => c.getText())
      .join("")
      .trim();
    return text || undefined;
  }

  return undefined;
}

/**
 * Converte parametros de funcao para ParamInfo[]
 */
function extractParams(params: { getName(): string; getType(): { getText(node?: Node): string } }[]): ParamInfo[] {
  return params.map((p) => ({
    name: p.getName(),
    type: simplifyType(p.getType().getText()),
  }));
}

/**
 * Simplifica tipos muito longos para melhor legibilidade
 */
function simplifyType(typeText: string): string {
  // Remove import(...) prefixes que ts-morph adiciona
  let simplified = typeText.replace(/import\([^)]+\)\./g, "");

  // Se ainda for muito longo (> 80 chars), truncar
  if (simplified.length > 80) {
    simplified = simplified.slice(0, 77) + "...";
  }

  return simplified;
}

/**
 * Extrai informacoes de funcoes de um arquivo
 */
export function extractFunctions(sourceFile: SourceFile): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  // 1. Funcoes declaradas (function foo() {})
  for (const func of sourceFile.getFunctions()) {
    const name = func.getName();
    if (!name) continue; // Pular funcoes anonimas

    functions.push({
      name,
      params: extractParams(func.getParameters()),
      returnType: simplifyType(func.getReturnType().getText()),
      isAsync: func.isAsync(),
      isExported: func.isExported(),
      isArrowFunction: false,
      jsdoc: getJsDocDescription(func),
    });
  }

  // 2. Arrow functions exportadas (export const foo = () => {})
  for (const varStatement of sourceFile.getVariableStatements()) {
    const isExported = varStatement.isExported();

    for (const varDecl of varStatement.getDeclarations()) {
      const init = varDecl.getInitializer();
      if (!init) continue;

      // Verificar se e uma arrow function
      if (init.getKind() === SyntaxKind.ArrowFunction) {
        const arrowFunc = init.asKind(SyntaxKind.ArrowFunction);
        if (!arrowFunc) continue;

        functions.push({
          name: varDecl.getName(),
          params: extractParams(arrowFunc.getParameters()),
          returnType: simplifyType(arrowFunc.getReturnType().getText()),
          isAsync: arrowFunc.isAsync(),
          isExported,
          isArrowFunction: true,
          jsdoc: getJsDocDescription(varStatement),
        });
      }

      // Verificar se e uma function expression (const foo = function() {})
      if (init.getKind() === SyntaxKind.FunctionExpression) {
        const funcExpr = init.asKind(SyntaxKind.FunctionExpression);
        if (!funcExpr) continue;

        functions.push({
          name: varDecl.getName(),
          params: extractParams(funcExpr.getParameters()),
          returnType: simplifyType(funcExpr.getReturnType().getText()),
          isAsync: funcExpr.isAsync(),
          isExported,
          isArrowFunction: false,
          jsdoc: getJsDocDescription(varStatement),
        });
      }
    }
  }

  return functions;
}

/**
 * Extrai informacoes de tipos (interfaces, type aliases, enums) de um arquivo
 */
export function extractTypes(sourceFile: SourceFile): TypeInfo[] {
  const types: TypeInfo[] = [];

  // 1. Interfaces
  for (const iface of sourceFile.getInterfaces()) {
    types.push({
      name: iface.getName(),
      kind: "interface",
      definition: formatInterfaceDefinition(iface),
      isExported: iface.isExported(),
    });
  }

  // 2. Type aliases
  for (const typeAlias of sourceFile.getTypeAliases()) {
    types.push({
      name: typeAlias.getName(),
      kind: "type",
      definition: simplifyType(typeAlias.getType().getText()),
      isExported: typeAlias.isExported(),
    });
  }

  // 3. Enums
  for (const enumDecl of sourceFile.getEnums()) {
    types.push({
      name: enumDecl.getName(),
      kind: "enum",
      definition: enumDecl.getMembers().map((m) => m.getName()).join(" | "),
      isExported: enumDecl.isExported(),
    });
  }

  return types;
}

/**
 * Formata a definicao de uma interface de forma legivel
 */
function formatInterfaceDefinition(iface: {
  getProperties(): { getName(): string; getType(): { getText(): string } }[];
  getMethods(): { getName(): string; getReturnType(): { getText(): string } }[];
  getExtends(): { getText(): string }[];
}): string {
  const parts: string[] = [];

  // Heranca
  const extendsClauses = iface.getExtends();
  if (extendsClauses.length > 0) {
    parts.push(`extends ${extendsClauses.map((e) => e.getText()).join(", ")}`);
  }

  // Propriedades
  const props = iface.getProperties();
  for (const prop of props) {
    const propType = simplifyType(prop.getType().getText());
    parts.push(`${prop.getName()}: ${propType}`);
  }

  // Metodos
  const methods = iface.getMethods();
  for (const method of methods) {
    const returnType = simplifyType(method.getReturnType().getText());
    parts.push(`${method.getName()}(): ${returnType}`);
  }

  return parts.length > 0 ? `{ ${parts.join("; ")} }` : "{}";
}

/**
 * Extrai nomes de exports de um arquivo
 */
export function extractExports(sourceFile: SourceFile): string[] {
  const exports: string[] = [];

  // Export declarations (export { foo, bar })
  for (const exportDecl of sourceFile.getExportDeclarations()) {
    for (const namedExport of exportDecl.getNamedExports()) {
      exports.push(namedExport.getName());
    }
  }

  // Exported functions
  for (const func of sourceFile.getFunctions()) {
    if (func.isExported() && func.getName()) {
      exports.push(func.getName()!);
    }
  }

  // Exported variables (const, let)
  for (const varStatement of sourceFile.getVariableStatements()) {
    if (varStatement.isExported()) {
      for (const decl of varStatement.getDeclarations()) {
        exports.push(decl.getName());
      }
    }
  }

  // Exported interfaces
  for (const iface of sourceFile.getInterfaces()) {
    if (iface.isExported()) {
      exports.push(iface.getName());
    }
  }

  // Exported type aliases
  for (const typeAlias of sourceFile.getTypeAliases()) {
    if (typeAlias.isExported()) {
      exports.push(typeAlias.getName());
    }
  }

  // Exported enums
  for (const enumDecl of sourceFile.getEnums()) {
    if (enumDecl.isExported()) {
      exports.push(enumDecl.getName());
    }
  }

  // Exported classes
  for (const classDecl of sourceFile.getClasses()) {
    if (classDecl.isExported() && classDecl.getName()) {
      exports.push(classDecl.getName()!);
    }
  }

  // Remove duplicatas e retorna
  return [...new Set(exports)];
}
