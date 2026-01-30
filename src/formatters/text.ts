/**
 * Formatadores de texto para output no terminal
 */

import type { MapResult, DeadResult, ImpactResult, SuggestResult, ContextResult, FileCategory } from "../types.js";
import { categoryIcons } from "../utils/detect.js";

/**
 * Formata resultado do MAP para texto
 */
export function formatMapText(result: MapResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📁 PROJECT MAP                           ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Arquivos: ${result.summary.totalFiles}\n`;
  out += `   Pastas: ${result.summary.totalFolders}\n`;
  out += `   Diretório: ${result.cwd}\n\n`;

  // Categorias
  out += `📂 CATEGORIAS\n`;
  const catOrder: FileCategory[] = [
    "page",
    "layout",
    "route",
    "component",
    "hook",
    "service",
    "store",
    "util",
    "type",
    "config",
    "test",
    "other",
  ];

  for (const cat of catOrder) {
    const count = result.summary.categories[cat];
    if (count) {
      const icon = categoryIcons[cat];
      out += `   ${icon} ${cat.padEnd(12)} ${count}\n`;
    }
  }

  // Estrutura de pastas
  out += `\n📁 ESTRUTURA (Top 15 pastas)\n`;
  const topFolders = result.folders
    .sort((a, b) => b.fileCount - a.fileCount)
    .slice(0, 15);

  for (const folder of topFolders) {
    out += `   ${folder.path}/ (${folder.fileCount} arquivos)\n`;
  }

  if (result.folders.length > 15) {
    out += `   ... e mais ${result.folders.length - 15} pastas\n`;
  }

  // Dependências circulares
  if (result.circularDependencies.length > 0) {
    out += `\n⚠️ DEPENDÊNCIAS CIRCULARES (${result.circularDependencies.length})\n`;
    for (const cycle of result.circularDependencies.slice(0, 5)) {
      out += `   ${cycle.join(" → ")}\n`;
    }
    if (result.circularDependencies.length > 5) {
      out += `   ... e mais ${result.circularDependencies.length - 5}\n`;
    }
  }

  return out;
}

/**
 * Formata resultado do DEAD para texto
 */
export function formatDeadText(result: DeadResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    💀 DEAD CODE                              ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  if (result.summary.totalDead === 0) {
    out += `✅ Nenhum código morto encontrado!\n`;
    out += `   Todos os arquivos e exports estão sendo utilizados.\n`;
    return out;
  }

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Total: ${result.summary.totalDead} itens não utilizados\n`;
  out += `   Arquivos órfãos: ${result.summary.byType.files}\n`;
  out += `   Exports não usados: ${result.summary.byType.exports}\n`;
  out += `   Dependências não usadas: ${result.summary.byType.dependencies}\n\n`;

  // Arquivos órfãos
  if (result.files.length > 0) {
    out += `🗑️ ARQUIVOS ÓRFÃOS (${result.files.length})\n`;
    out += `   Arquivos que ninguém importa:\n\n`;

    // Agrupar por categoria
    const byCategory = new Map<FileCategory, typeof result.files>();
    for (const file of result.files) {
      if (!byCategory.has(file.category)) {
        byCategory.set(file.category, []);
      }
      byCategory.get(file.category)!.push(file);
    }

    for (const [category, files] of byCategory) {
      const icon = categoryIcons[category];
      out += `   ${icon} ${category}/ (${files.length})\n`;
      for (const file of files.slice(0, 5)) {
        out += `      ${file.path}\n`;
      }
      if (files.length > 5) {
        out += `      ... e mais ${files.length - 5}\n`;
      }
      out += `\n`;
    }
  }

  // Exports não usados
  if (result.exports.length > 0) {
    out += `📤 EXPORTS NÃO USADOS (${result.exports.length})\n`;
    for (const exp of result.exports.slice(0, 10)) {
      out += `   ${exp.file}: ${exp.export}\n`;
    }
    if (result.exports.length > 10) {
      out += `   ... e mais ${result.exports.length - 10}\n`;
    }
    out += `\n`;
  }

  // Dependências não usadas
  if (result.dependencies.length > 0) {
    out += `📦 DEPENDÊNCIAS NÃO USADAS (${result.dependencies.length})\n`;
    for (const dep of result.dependencies) {
      out += `   ${dep}\n`;
    }
    out += `\n`;
  }

  // Info sobre filtros aplicados
  if (result.filters?.firebase.detected) {
    out += `🔥 FIREBASE CLOUD FUNCTIONS\n`;
    out += `   Projeto Firebase detectado.\n`;
    if (result.filters.firebase.excludedCount > 0) {
      out += `   ${result.filters.firebase.excludedCount} arquivo(s) filtrado(s) (exportados em functions/src/index.ts)\n`;
    }
    out += `\n`;
  }

  out += `💡 SUGESTÃO\n`;
  out += `   Execute 'npx knip --fix' para remover automaticamente.\n`;

  return out;
}

/**
 * Formata resultado do IMPACT para texto
 */
export function formatImpactText(result: ImpactResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    🎯 IMPACT ANALYSIS                        ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Info do arquivo
  const icon = categoryIcons[result.category];
  out += `📍 ARQUIVO: ${result.target}\n`;
  out += `   ${icon} ${result.category}\n\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Upstream (quem usa)
  out += `⬆️ USADO POR (${result.upstream.total} arquivo${result.upstream.total !== 1 ? "s" : ""} único${result.upstream.total !== 1 ? "s" : ""})\n`;

  if (result.upstream.direct.length > 0 || result.upstream.indirect.length > 0) {
    out += `   📍 ${result.upstream.direct.length} direto${result.upstream.direct.length !== 1 ? "s" : ""} + ${result.upstream.indirect.length} indireto${result.upstream.indirect.length !== 1 ? "s" : ""}\n`;
  }

  out += `   Quem importa este arquivo:\n\n`;

  if (result.upstream.total === 0) {
    out += `   Ninguém importa este arquivo diretamente.\n`;
  } else {
    // Diretos
    for (const file of result.upstream.direct.slice(0, 10)) {
      const fileIcon = categoryIcons[file.category];
      out += `   ${fileIcon} ${file.path}\n`;
    }
    if (result.upstream.direct.length > 10) {
      out += `   ... e mais ${result.upstream.direct.length - 10} diretos\n`;
    }

    // Indiretos (resumido)
    if (result.upstream.indirect.length > 0) {
      out += `\n   Indiretos: ${result.upstream.indirect.slice(0, 5).map((f) => f.path.split("/").pop()).join(", ")}`;
      if (result.upstream.indirect.length > 5) {
        out += ` (+${result.upstream.indirect.length - 5})`;
      }
      out += `\n`;
    }
  }

  out += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Downstream (dependências)
  out += `⬇️ DEPENDÊNCIAS (${result.downstream.total} arquivo${result.downstream.total !== 1 ? "s" : ""} único${result.downstream.total !== 1 ? "s" : ""})\n`;

  if (result.downstream.direct.length > 0 || result.downstream.indirect.length > 0) {
    out += `   📍 ${result.downstream.direct.length} direto${result.downstream.direct.length !== 1 ? "s" : ""} + ${result.downstream.indirect.length} indireto${result.downstream.indirect.length !== 1 ? "s" : ""}\n`;
  }

  out += `   O que este arquivo importa:\n\n`;

  if (result.downstream.total === 0) {
    out += `   Este arquivo não importa nenhum arquivo local.\n`;
  } else {
    for (const file of result.downstream.direct.slice(0, 10)) {
      const fileIcon = categoryIcons[file.category];
      out += `   ${fileIcon} ${file.path}\n`;
    }
    if (result.downstream.direct.length > 10) {
      out += `   ... e mais ${result.downstream.direct.length - 10}\n`;
    }
  }

  out += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Métricas
  out += `📊 MÉTRICAS DE IMPACTO\n\n`;
  out += `   Arquivos que importam este (upstream):  ${result.upstream.total} único${result.upstream.total !== 1 ? "s" : ""}\n`;
  out += `   Arquivos que este importa (downstream): ${result.downstream.total} único${result.downstream.total !== 1 ? "s" : ""}\n`;

  // Riscos
  if (result.risks.length > 0) {
    out += `\n⚠️ RISCOS IDENTIFICADOS (${result.risks.length})\n\n`;
    for (const risk of result.risks) {
      const severity =
        risk.severity === "high" ? "🔴" : risk.severity === "medium" ? "🟡" : "🟢";
      out += `   ${severity} ${risk.severity.toUpperCase()}: ${risk.message}\n`;
    }
  }

  // Sugestões
  if (result.suggestions.length > 0) {
    out += `\n💡 SUGESTÕES\n\n`;
    for (const suggestion of result.suggestions) {
      out += `   • ${suggestion}\n`;
    }
  }

  return out;
}

/**
 * Formata resultado do SUGGEST para texto
 */
export function formatSuggestText(result: SuggestResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📚 SUGGEST                                ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Info do arquivo alvo
  const icon = categoryIcons[result.category];
  out += `📍 Antes de modificar: ${result.target}\n`;
  out += `   ${icon} ${result.category}\n\n`;

  if (result.suggestions.length === 0) {
    out += `✅ Nenhuma sugestao de leitura.\n`;
    out += `   Este arquivo nao tem dependencias ou arquivos relacionados.\n`;
    return out;
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Agrupar por prioridade
  const byPriority = {
    critical: result.suggestions.filter((s) => s.priority === "critical"),
    high: result.suggestions.filter((s) => s.priority === "high"),
    medium: result.suggestions.filter((s) => s.priority === "medium"),
    low: result.suggestions.filter((s) => s.priority === "low"),
  };

  // CRITICAL - Tipos/interfaces
  if (byPriority.critical.length > 0) {
    out += `🔴 LEITURA CRITICA (${byPriority.critical.length})\n`;
    out += `   Tipos e interfaces que voce DEVE entender:\n\n`;
    for (const s of byPriority.critical) {
      const sIcon = categoryIcons[s.category];
      out += `   ${sIcon} ${s.path}\n`;
      out += `      ${s.reason}\n`;
    }
    out += `\n`;
  }

  // HIGH - Dependencias diretas
  if (byPriority.high.length > 0) {
    out += `🟠 LEITURA IMPORTANTE (${byPriority.high.length})\n`;
    out += `   Arquivos importados diretamente:\n\n`;
    for (const s of byPriority.high) {
      const sIcon = categoryIcons[s.category];
      out += `   ${sIcon} ${s.path}\n`;
      out += `      ${s.reason}\n`;
    }
    out += `\n`;
  }

  // MEDIUM - Upstream
  if (byPriority.medium.length > 0) {
    out += `🟡 LEITURA RECOMENDADA (${byPriority.medium.length})\n`;
    out += `   Arquivos que usam este arquivo:\n\n`;
    for (const s of byPriority.medium) {
      const sIcon = categoryIcons[s.category];
      out += `   ${sIcon} ${s.path}\n`;
      out += `      ${s.reason}\n`;
    }
    out += `\n`;
  }

  // LOW - Testes
  if (byPriority.low.length > 0) {
    out += `🟢 LEITURA OPCIONAL (${byPriority.low.length})\n`;
    out += `   Testes relacionados:\n\n`;
    for (const s of byPriority.low) {
      const sIcon = categoryIcons[s.category];
      out += `   ${sIcon} ${s.path}\n`;
      out += `      ${s.reason}\n`;
    }
    out += `\n`;
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Total de arquivos sugeridos: ${result.suggestions.length}\n`;
  if (byPriority.critical.length > 0) {
    out += `   🔴 Criticos: ${byPriority.critical.length}\n`;
  }
  if (byPriority.high.length > 0) {
    out += `   🟠 Importantes: ${byPriority.high.length}\n`;
  }
  if (byPriority.medium.length > 0) {
    out += `   🟡 Recomendados: ${byPriority.medium.length}\n`;
  }
  if (byPriority.low.length > 0) {
    out += `   🟢 Opcionais: ${byPriority.low.length}\n`;
  }

  return out;
}

/**
 * Formata resultado do CONTEXT para texto
 */
export function formatContextText(result: ContextResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📄 CONTEXT                                ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Info do arquivo
  const icon = categoryIcons[result.category];
  out += `📍 ARQUIVO: ${result.file}\n`;
  out += `   ${icon} ${result.category}\n\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Imports
  if (result.imports.length > 0) {
    out += `📥 IMPORTS (${result.imports.length})\n\n`;
    for (const imp of result.imports) {
      const typeLabel = imp.isTypeOnly ? " [type]" : "";
      out += `   ${imp.source}${typeLabel}\n`;
      if (imp.specifiers.length > 0) {
        out += `      { ${imp.specifiers.join(", ")} }\n`;
      }
    }
    out += `\n`;
  }

  // Exports
  if (result.exports.length > 0) {
    out += `📤 EXPORTS (${result.exports.length})\n`;
    out += `   ${result.exports.join(", ")}\n\n`;
  }

  // Types
  if (result.types.length > 0) {
    out += `🏷️ TYPES (${result.types.length})\n\n`;
    for (const t of result.types) {
      const exported = t.isExported ? "export " : "";
      out += `   ${exported}${t.kind} ${t.name}\n`;
      out += `      ${t.definition}\n\n`;
    }
  }

  // Functions
  if (result.functions.length > 0) {
    out += `⚡ FUNCTIONS (${result.functions.length})\n\n`;
    for (const fn of result.functions) {
      const exported = fn.isExported ? "export " : "";
      const async = fn.isAsync ? "async " : "";
      const arrow = fn.isArrowFunction ? " =>" : "";
      const params = fn.params.map((p) => `${p.name}: ${p.type}`).join(", ");
      out += `   ${exported}${async}${fn.name}(${params})${arrow}: ${fn.returnType}\n`;
      if (fn.jsdoc) {
        out += `      /** ${fn.jsdoc} */\n`;
      }
      out += `\n`;
    }
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Imports: ${result.imports.length}\n`;
  out += `   Exports: ${result.exports.length}\n`;
  out += `   Types: ${result.types.length}\n`;
  out += `   Functions: ${result.functions.length}\n`;

  return out;
}
