/**
 * Funções de similaridade de strings
 *
 * Usa algoritmo de Levenshtein para calcular distância entre strings
 * e encontrar candidatos similares para sugestões "você quis dizer?"
 */

/**
 * Calcula a distância de Levenshtein entre duas strings
 *
 * A distância representa o número mínimo de operações (inserção, deleção, substituição)
 * necessárias para transformar uma string na outra.
 *
 * @param a - Primeira string
 * @param b - Segunda string
 * @returns Número de edições necessárias
 *
 * @example
 * levenshteinDistance('auth', 'auht') // 2 (troca de posição = 2 substituições)
 * levenshteinDistance('auth', 'auth') // 0 (iguais)
 * levenshteinDistance('auth', 'auths') // 1 (1 inserção)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Inicializa primeira coluna
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Inicializa primeira linha
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Preenche a matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1, // inserção
          matrix[i - 1][j] + 1 // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Opções para busca de itens similares
 */
export interface FindSimilarOptions<T> {
  /** Distância máxima de Levenshtein para considerar similar (default: 3) */
  maxDistance?: number;
  /** Número máximo de resultados (default: 5) */
  limit?: number;
  /** Normalizar para lowercase antes de comparar (default: true) */
  normalize?: boolean;
  /** Função para extrair a chave de comparação de cada item */
  extractKey?: (item: T) => string;
}

/**
 * Encontra itens similares a um target
 *
 * Usa Levenshtein distance e match de substring para encontrar candidatos.
 * Substring match tem prioridade (score 0), seguido por Levenshtein.
 *
 * @param target - Termo buscado
 * @param candidates - Lista de candidatos
 * @param options - Configurações opcionais
 * @returns Lista de candidatos similares, ordenados por relevância
 *
 * @example
 * const areas = ['auth', 'dashboard', 'stripe'];
 * findSimilar('auht', areas) // ['auth']
 * findSimilar('dash', areas) // ['dashboard']
 */
export function findSimilar<T>(
  target: string,
  candidates: T[],
  options: FindSimilarOptions<T> = {}
): T[] {
  const {
    maxDistance = 3,
    limit = 5,
    normalize = true,
    extractKey = (item: T) => String(item),
  } = options;

  const normalizedTarget = normalize ? target.toLowerCase() : target;

  const scored = candidates
    .map((item) => {
      const key = extractKey(item);
      const normalizedKey = normalize ? key.toLowerCase() : key;
      // Remove extensão de arquivo para comparação
      const keyNoExt = normalizedKey.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");

      let score = Infinity;

      // Substring match é o melhor (score 0)
      if (normalizedKey.includes(normalizedTarget) || keyNoExt.includes(normalizedTarget)) {
        score = 0;
      } else {
        // Usa Levenshtein para outros casos
        score = levenshteinDistance(keyNoExt, normalizedTarget);
      }

      return { item, score };
    })
    .filter(({ score }) => score <= maxDistance)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);

  return scored.map(({ item }) => item);
}

/**
 * Encontra o melhor match para sugestão "você quis dizer?"
 *
 * Mais restritivo que findSimilar (maxDistance: 2) para evitar
 * sugestões incorretas.
 *
 * @param target - Termo buscado
 * @param candidates - Lista de candidatos
 * @param extractKey - Função para extrair chave de comparação
 * @returns Melhor match ou null se não houver sugestão confiável
 *
 * @example
 * findBestMatch('auht', ['auth', 'dashboard']) // 'auth'
 * findBestMatch('xyz', ['auth', 'dashboard']) // null
 */
export function findBestMatch<T>(
  target: string,
  candidates: T[],
  extractKey: (item: T) => string = (item: T) => String(item)
): T | null {
  const similar = findSimilar(target, candidates, {
    maxDistance: 2, // Mais restritivo para "você quis dizer"
    limit: 1,
    extractKey,
  });

  return similar.length > 0 ? similar[0] : null;
}

/**
 * Extrai nome do arquivo de um caminho (sem extensão)
 *
 * Útil para comparar arquivos ignorando caminho e extensão.
 *
 * @param filePath - Caminho do arquivo
 * @returns Nome do arquivo sem extensão
 *
 * @example
 * extractFileName('src/hooks/useAuth.ts') // 'useAuth'
 * extractFileName('Button.tsx') // 'Button'
 */
export function extractFileName(filePath: string): string {
  const fileName = filePath.split("/").pop() || filePath;
  return fileName.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
}
