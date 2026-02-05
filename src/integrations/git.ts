/**
 * Integração Git - Histórico de commits e blame info
 */

import { existsSync } from "fs";
import { execSync } from "child_process";

/**
 * Informação de um commit
 */
export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  date: string;
  author: string;
}

/**
 * Informação de blame para uma linha específica
 */
export interface BlameInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
  line: number;
}

/**
 * Verifica se o diretório é um repositório Git
 */
export function hasGitRepo(cwd: string): boolean {
  return existsSync(cwd + "/.git");
}

/**
 * Retorna histórico de commits para um arquivo
 *
 * @param filePath - Caminho do arquivo (relativo ao cwd)
 * @param cwd - Diretório do projeto
 * @param limit - Número máximo de commits (default: 10)
 * @returns Lista de commits ordenados por data (mais recente primeiro)
 */
export async function getCommitsForFile(
  filePath: string,
  cwd: string,
  limit: number = 10
): Promise<CommitInfo[]> {
  if (!hasGitRepo(cwd)) {
    return [];
  }

  try {
    // Format: hash|shortHash|message|date|author
    const format = "%H|%h|%s|%ad|%an";
    const cmd = `git log --follow --oneline --date=short --format="${format}" -n ${limit} -- "${filePath}"`;

    const output = execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"], // Silenciar stderr
    });

    const commits: CommitInfo[] = [];

    for (const line of output.trim().split("\n")) {
      if (!line) continue;

      const parts = line.split("|");
      if (parts.length >= 5) {
        commits.push({
          hash: parts[0],
          shortHash: parts[1],
          message: parts[2],
          date: parts[3],
          author: parts[4],
        });
      }
    }

    return commits;
  } catch (error) {
    // Git command failed - provavelmente arquivo não tracked ou não existe
    return [];
  }
}

/**
 * Retorna blame info para uma linha específica
 *
 * @param filePath - Caminho do arquivo (relativo ao cwd)
 * @param line - Número da linha (1-indexed)
 * @param cwd - Diretório do projeto
 * @returns Informação de blame ou null se não encontrou
 */
export async function getBlameInfo(
  filePath: string,
  line: number,
  cwd: string
): Promise<BlameInfo | null> {
  if (!hasGitRepo(cwd)) {
    return null;
  }

  try {
    // Git blame format: hash shortHash author date time timezone message
    const cmd = `git blame -L ${line},${line} -p -- "${filePath}"`;

    const output = execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"], // Silenciar stderr
    });

    const lines = output.trim().split("\n");
    if (lines.length === 0) {
      return null;
    }

    // Primeira linha: hash author date time timezone
    const firstLine = lines[0];
    const match = firstLine.match(/^([0-9a-f]{40}) \d+ \((\S+) (\S+) (\S+)/);

    if (!match) {
      return null;
    }

    const [, hash, author, date] = match;
    const shortHash = hash.substring(0, 7);

    // Encontrar message (linhas que começam com \t)
    const messageLines = lines.filter((l) => l.startsWith("\t"));
    const message = messageLines[0]?.substring(1) || "";

    return {
      hash,
      shortHash,
      author,
      date,
      message,
      line,
    };
  } catch (error) {
    // Git command failed - provavelmente linha não existe ou arquivo não tracked
    return null;
  }
}

/**
 * Retorna blame info para múltiplas linhas
 *
 * @param filePath - Caminho do arquivo (relativo ao cwd)
 * @param startLine - Linha inicial (1-indexed)
 * @param endLine - Linha final (1-indexed)
 * @param cwd - Diretório do projeto
 * @returns Array de informações de blame
 */
export async function getBlameInfoRange(
  filePath: string,
  startLine: number,
  endLine: number,
  cwd: string
): Promise<BlameInfo[]> {
  if (!hasGitRepo(cwd)) {
    return [];
  }

  try {
    const cmd = `git blame -L ${startLine},${endLine} -p -- "${filePath}"`;

    const output = execSync(cmd, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"], // Silenciar stderr
    });

    const lines = output.trim().split("\n");
    const blameInfos: BlameInfo[] = [];

    let currentHash: string | null = null;
    let currentShortHash: string | null = null;
    let currentAuthor: string | null = null;
    let currentDate: string | null = null;
    let currentMessage: string | null = null;
    let currentLine = startLine;

    for (const line of lines) {
      // Linha de cabeçalho: hash author date time timezone
      const match = line.match(/^([0-9a-f]{40}) (\d+) \((\S+) (\S+) (\S+)/);

      if (match) {
        // Salvar blame info anterior se existir
        if (currentHash && currentMessage !== null) {
          blameInfos.push({
            hash: currentHash,
            shortHash: currentShortHash!,
            author: currentAuthor!,
            date: currentDate!,
            message: currentMessage,
            line: currentLine,
          });
        }

        // Iniciar novo blame info
        currentHash = match[1];
        currentShortHash = currentHash.substring(0, 7);
        currentAuthor = match[3];
        currentDate = match[4];
        currentLine++;
        currentMessage = null;
      } else if (line.startsWith("\t") && currentHash !== null) {
        // Linha de mensagem (começa com tab)
        if (currentMessage === null) {
          currentMessage = line.substring(1);
        }
      }
    }

    // Salvar último blame info
    if (currentHash && currentMessage !== null) {
      blameInfos.push({
        hash: currentHash,
        shortHash: currentShortHash!,
        author: currentAuthor!,
        date: currentDate!,
        message: currentMessage,
        line: currentLine,
      });
    }

    return blameInfos;
  } catch (error) {
    // Git command failed
    return [];
  }
}

/**
 * Retorna última mensagem de commit que modificou o arquivo
 *
 * @param filePath - Caminho do arquivo (relativo ao cwd)
 * @param cwd - Diretório do projeto
 * @returns Última mensagem de commit ou null
 */
export async function getLastCommitMessage(filePath: string, cwd: string): Promise<string | null> {
  const commits = await getCommitsForFile(filePath, cwd, 1);
  return commits.length > 0 ? commits[0].message : null;
}

/**
 * Retorna data da última modificação do arquivo no Git
 *
 * @param filePath - Caminho do arquivo (relativo ao cwd)
 * @param cwd - Diretório do projeto
 * @returns Data da última modificação ou null
 */
export async function getLastCommitDate(filePath: string, cwd: string): Promise<string | null> {
  const commits = await getCommitsForFile(filePath, cwd, 1);
  return commits.length > 0 ? commits[0].date : null;
}
