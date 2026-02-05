/**
 * File Matcher Module
 *
 * Lógica compartilhada para matching de arquivos usando algoritmo de prioridade.
 * Elimina duplicação entre comandos impact e suggest.
 */

/**
 * Encontra o arquivo target usando algoritmo de prioridade
 *
 * O algoritmo de matching funciona em 6 níveis de prioridade:
 * 1. Match exato de path completo (case-sensitive)
 * 2. Match exato de path completo (case-insensitive)
 * 3. Nome + diretório contém o path do target
 * 4. Path do target contém diretório do arquivo
 * 5. Mesmo nome mas diretório diferente
 * 6. Match parcial no path completo
 * 7. Match parcial mais flexível (apenas pelo nome)
 *
 * @param target - Caminho ou nome do arquivo a ser encontrado
 * @param allFiles - Lista de todos os arquivos do projeto
 * @returns Caminho completo do arquivo encontrado ou null
 *
 * @example
 * ```typescript
 * const allFiles = ["src/components/Button.tsx", "src/pages/Button.tsx"];
 * const result = findTargetFile("Button", allFiles);
 * // Retorna "src/components/Button.tsx" (primeiro match por prioridade)
 * ```
 */
export function findTargetFile(target: string, allFiles: string[]): string | null {
  const normalizedTarget = target.replace(/\\/g, "/").toLowerCase();

  // Match exato
  if (allFiles.includes(normalizedTarget)) {
    return normalizedTarget;
  }

  // Match exato (case-insensitive)
  const exactMatch = allFiles.find(f => f.toLowerCase() === normalizedTarget);
  if (exactMatch) {
    return exactMatch;
  }

  // Separar path e nome do arquivo do target
  const targetParts = normalizedTarget.split("/");
  const targetName = targetParts.pop() || "";
  const targetNameNoExt = targetName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  const targetDir = targetParts.join("/"); // Path sem o nome do arquivo

  const matches: Array<{ file: string; priority: number }> = [];

  for (const file of allFiles) {
    const fileLower = file.toLowerCase();
    const fileParts = fileLower.split("/");
    const fileName = fileParts.pop() || "";
    const fileNameNoExt = fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
    const fileDir = fileParts.join("/");

    // Prioridade 1: Match exato de path completo (incluindo diretórios)
    if (fileLower === normalizedTarget) {
      matches.push({ file, priority: 1 });
    }
    // Prioridade 2: Match por nome + diretório contém o path do target
    // Ex: target=src/services/quota/index.ts, file=src/pages/LandingPages/index.ts
    // O diretório do target (src/services/quota) deve estar contido no path do arquivo
    else if (fileNameNoExt === targetNameNoExt) {
      if (targetDir && fileDir.includes(targetDir)) {
        matches.push({ file, priority: 2 });
      } else if (targetDir && normalizedTarget.includes(fileDir)) {
        // Path do target contém diretório do arquivo
        matches.push({ file, priority: 3 });
      } else {
        // Mesmo nome mas diretório diferente - menor prioridade
        matches.push({ file, priority: 4 });
      }
    }
    // Prioridade 5: Match parcial no path completo
    else if (fileLower.includes(normalizedTarget)) {
      matches.push({ file, priority: 5 });
    }
  }

  // Se não encontrou nada, tentar match parcial mais flexível
  if (matches.length === 0) {
    for (const file of allFiles) {
      if (file.toLowerCase().includes(targetNameNoExt)) {
        matches.push({ file, priority: 6 });
      }
    }
  }

  // Ordenar por prioridade e retornar o melhor match
  if (matches.length > 0) {
    matches.sort((a, b) => a.priority - b.priority);
    return matches[0].file;
  }

  return null;
}
