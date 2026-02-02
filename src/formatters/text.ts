/**
 * Formatadores de texto para output no terminal
 */

import type {
  MapResult,
  MapAreasInfo,
  DeadResult,
  ImpactResult,
  SuggestResult,
  ContextResult,
  AreasResult,
  AreaDetailResult,
  AreaContextResult,
  FileCategory,
} from "../types.js";
import type { FindResult } from "../commands/find.js";
import { categoryIcons } from "../utils/detect.js";

/**
 * Formata resultado do MAP como resumo compacto + dicas contextuais
 * Usado como output padrão para economizar tokens
 */
export function formatMapSummary(
  result: MapResult,
  areasInfo?: MapAreasInfo
): string {
  let out = "";

  // Resumo compacto
  out += `📊 ${result.summary.totalFiles} arquivos | ${result.summary.totalFolders} pastas\n`;

  // Categorias em uma linha
  const catOrder: FileCategory[] = [
    "component",
    "hook",
    "page",
    "service",
    "util",
    "type",
    "config",
    "test",
    "layout",
    "route",
    "store",
    "cloud-function",
    "other",
  ];

  const catParts: string[] = [];
  for (const cat of catOrder) {
    const count = result.summary.categories[cat];
    if (count) {
      catParts.push(`${count} ${cat}s`);
    }
  }
  out += `   ${catParts.join(", ")}\n`;

  // Áreas (se disponível)
  if (areasInfo && areasInfo.total > 0) {
    out += `\n🗂️ Áreas: ${areasInfo.names.join(", ")}\n`;
  }

  // Alertas e dicas contextuais
  out += `\n`;

  // Alerta: Firebase Cloud Functions
  const cloudFunctionCount = result.summary.categories["cloud-function"] || 0;
  if (cloudFunctionCount > 0) {
    out += `🔥 Firebase Cloud Functions detectado\n`;
    out += `   ${cloudFunctionCount} function(s) em functions/src/\n`;
    out += `   → Use 'ai-tool functions' para listar triggers\n\n`;
  }

  // Alerta: dependências circulares
  if (result.circularDependencies.length > 0) {
    out += `⚠️ ${result.circularDependencies.length} dependência(s) circular(es) detectada(s)\n`;
    out += `   → Use impact <arquivo> para investigar\n\n`;
  }

  // Alerta: arquivos sem área
  if (areasInfo && areasInfo.unmappedCount > 0) {
    out += `⚠️ ${areasInfo.unmappedCount} arquivo(s) sem área definida\n`;
    out += `   → Use areas init para configurar\n\n`;
  }

  // Dicas de navegação
  out += `📖 Próximos passos:\n`;
  out += `   → area <nome> - ver arquivos de uma área\n`;
  out += `   → suggest <arquivo> - o que ler antes de editar\n`;
  out += `   → context <arquivo> - ver API de um arquivo\n`;

  return out;
}

/**
 * Formata resultado do MAP para texto completo (lista todos arquivos)
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
    "cloud-function",
    "other",
  ];

  for (const cat of catOrder) {
    const count = result.summary.categories[cat];
    if (count) {
      const icon = categoryIcons[cat];
      out += `   ${icon} ${cat.padEnd(14)} ${count}\n`;
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

  out += `💡 COMO RESOLVER\n\n`;
  out += `   1. Falsos positivos? Adicione ao .analyze/areas.config.json:\n`;
  out += `      { "ignore": ["functions/lib/**", "**/*.test.ts"] }\n\n`;
  out += `   2. Remover automaticamente:\n`;
  out += `      npx knip --fix\n\n`;
  out += `   3. Ver detalhes em JSON:\n`;
  out += `      ai-tool dead --format=json\n`;

  // Detectar e sugerir padrões comuns
  const suggestions = generateIgnoreSuggestions(result);
  if (suggestions.length > 0) {
    out += `\n🎯 SUGESTÕES INTELIGENTES\n\n`;
    for (const suggestion of suggestions) {
      out += `   ${suggestion.icon} ${suggestion.pattern}\n`;
      out += `      Motivo: ${suggestion.reason}\n`;
      out += `      Arquivos afetados: ${suggestion.count}\n\n`;
    }
  }

  return out;
}

/**
 * Gera sugestões de padrões para ignorar baseado nos arquivos encontrados
 */
function generateIgnoreSuggestions(result: DeadResult): Array<{icon: string; pattern: string; reason: string; count: number}> {
  const suggestions: Array<{icon: string; pattern: string; reason: string; count: number}> = [];
  const files = result.files.map(f => f.path);

  // Detectar functions/lib/
  const libFiles = files.filter(f => f.includes("functions/lib/"));
  if (libFiles.length > 0) {
    suggestions.push({
      icon: "📦",
      pattern: "functions/lib/**",
      reason: "Build compilado do Firebase Functions",
      count: libFiles.length
    });
  }

  // Detectar arquivos de teste
  const testFiles = files.filter(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f));
  if (testFiles.length > 3) {
    suggestions.push({
      icon: "🧪",
      pattern: "**/*.(test|spec).(ts|tsx|js|jsx)",
      reason: "Arquivos de teste geralmente são entry points próprios",
      count: testFiles.length
    });
  }

  // Detectar arquivos de configuração/build
  const configFiles = files.filter(f => 
    f.includes("vite.config") || 
    f.includes("next.config") ||
    f.includes("tailwind.config") ||
    f.includes("jest.config") ||
    f.includes("eslint.config")
  );
  if (configFiles.length > 0) {
    suggestions.push({
      icon: "⚙️",
      pattern: "**/*.config.(ts|js|mjs|cjs)",
      reason: "Arquivos de configuração são entry points",
      count: configFiles.length
    });
  }

  // Detectar arquivos .d.ts
  const dtsFiles = files.filter(f => f.endsWith(".d.ts"));
  if (dtsFiles.length > 0) {
    suggestions.push({
      icon: "📘",
      pattern: "**/*.d.ts",
      reason: "Arquivos de definição TypeScript",
      count: dtsFiles.length
    });
  }

  // Detectar scripts
  const scriptFiles = files.filter(f => f.startsWith("scripts/") || f.includes("/scripts/"));
  if (scriptFiles.length > 0) {
    suggestions.push({
      icon: "📜",
      pattern: "scripts/**",
      reason: "Scripts de automação são entry points",
      count: scriptFiles.length
    });
  }

  return suggestions;
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

/**
 * Formata resultado do AREAS para texto
 */
export function formatAreasText(result: AreasResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📦 PROJECT AREAS                         ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Áreas: ${result.summary.totalAreas}\n`;
  out += `   Arquivos: ${result.summary.totalFiles}\n`;
  if (result.summary.unmappedCount > 0) {
    out += `   ⚠️ Sem área: ${result.summary.unmappedCount}\n`;
  }
  out += `\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Lista de áreas
  out += `📦 ÁREAS DETECTADAS\n\n`;

  for (const area of result.areas) {
    const autoTag = area.isAutoDetected ? " (auto)" : "";
    out += `   ${area.name.padEnd(25)} ${String(area.fileCount).padStart(4)} arquivos${autoTag}\n`;

    // Mostrar distribuição de categorias (resumido)
    const catSummary = Object.entries(area.categories)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 4)
      .map(([cat, count]) => `${categoryIcons[cat as FileCategory]}${count}`)
      .join(" ");

    if (catSummary) {
      out += `      ${catSummary}\n`;
    }

    if (area.description) {
      out += `      ${area.description}\n`;
    }

    out += `\n`;
  }

  // Arquivos sem área
  if (result.unmapped.length > 0) {
    out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    out += `⚠️ ARQUIVOS SEM ÁREA (${result.unmapped.length})\n\n`;

    for (const file of result.unmapped.slice(0, 10)) {
      const icon = categoryIcons[file.category];
      out += `   ${icon} ${file.path}\n`;
    }

    if (result.unmapped.length > 10) {
      out += `   ... e mais ${result.unmapped.length - 10}\n`;
    }

    out += `\n💡 Adicione padrões em .analyze/areas.config.json\n`;
    out += `   ou execute 'ai-tool areas init' para gerar configuração\n`;
  }

  out += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  out += `💡 Use 'ai-tool area <nome>' para ver detalhes de uma área\n`;
  out += `   Exemplo: ai-tool area auth\n`;

  return out;
}

/**
 * Formata resultado do AREA (detalhe) para texto
 */
export function formatAreaDetailText(
  result: AreaDetailResult,
  options: { full?: boolean; filterType?: FileCategory } = {}
): string {
  const { full = false, filterType } = options;
  const { area, byCategory } = result;

  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📦 AREA DETAIL                           ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Header da área
  out += `📦 ${area.name}\n`;
  if (area.description) {
    out += `   ${area.description}\n`;
  }
  out += `\n`;

  // Resumo de categorias
  out += `📊 Resumo: ${area.fileCount} arquivos\n   `;

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
    "cloud-function",
    "other",
  ];

  const catParts: string[] = [];
  for (const cat of catOrder) {
    const count = area.categories[cat];
    if (count) {
      catParts.push(`${categoryIcons[cat]} ${cat}: ${count}`);
    }
  }
  out += catParts.join("  ");
  out += `\n\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Se filtro por tipo, mostrar só esse tipo
  if (filterType) {
    const files = byCategory[filterType] || [];
    out += `${categoryIcons[filterType]} ${filterType.toUpperCase()} (${files.length})\n\n`;

    for (const file of files) {
      const desc = file.description ? `  ${file.description}` : "";
      out += `   ${file.path}${desc}\n`;
    }

    return out;
  }

  // Listar por categoria
  const maxFilesPerCategory = full ? 100 : 8;

  for (const cat of catOrder) {
    const files = byCategory[cat];
    if (!files || files.length === 0) continue;

    out += `${categoryIcons[cat]} ${cat.toUpperCase()} (${files.length})\n`;

    const filesToShow = files.slice(0, maxFilesPerCategory);
    const remaining = files.length - filesToShow.length;

    for (const file of filesToShow) {
      // Truncar path se muito longo
      const maxPathLen = 50;
      let displayPath = file.path;
      if (displayPath.length > maxPathLen) {
        displayPath = "..." + displayPath.slice(-maxPathLen + 3);
      }

      const desc = file.description || "";
      out += `   ${displayPath.padEnd(maxPathLen + 2)} ${desc}\n`;
    }

    if (remaining > 0) {
      out += `   ... e mais ${remaining}\n`;
    }

    out += `\n`;
  }

  if (!full && area.fileCount > 20) {
    out += `💡 Use --full para ver todos os arquivos\n`;
  }

  return out;
}

/**
 * Formata resultado do FIND para texto
 */
export function formatFindText(result: FindResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    🔍 FIND                                   ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Query e filtros
  if (result.query) {
    out += `🔍 "${result.query}"`;
    if (result.filters.type) {
      out += ` [type: ${result.filters.type}]`;
    }
    if (result.filters.area) {
      out += ` [area: ${result.filters.area}]`;
    }
    out += `\n\n`;
  } else {
    // Modo listar todos
    out += `📋 Listando todos os símbolos do tipo: ${result.filters.type || "all"}\n\n`;
  }

  // Se não encontrou nada
  if (!result.definition && result.references.length === 0 && result.summary.definitions === 0) {
    if (result.query) {
      out += `❌ Nenhum resultado encontrado para "${result.query}"\n\n`;
    } else {
      out += `❌ Nenhum símbolo do tipo "${result.filters.type}" encontrado\n\n`;
    }
    out += `💡 Dicas:\n`;
    out += `   • Verifique a ortografia\n`;
    out += `   • Tente buscar parte do nome\n`;
    out += `   • Remova filtros de tipo ou área\n`;
    return out;
  }

  // Resumo
  out += `📊 ${result.summary.definitions} definição, ${result.summary.references} referências em ${result.summary.files} arquivos\n\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Definição
  if (result.definition) {
    out += `📍 DEFINIÇÃO\n\n`;
    const def = result.definition;
    const icon = categoryIcons[def.category];
    out += `   ${icon} ${def.file}:${def.line}\n`;
    out += `      ${def.code}\n`;
    out += `\n`;
  }

  // Referências
  if (result.references.length > 0) {
    // Agrupar por tipo de match
    const imports = result.references.filter((r) => r.matchType === "import");
    const usages = result.references.filter((r) => r.matchType === "usage");

    if (imports.length > 0) {
      out += `📥 IMPORTS (${imports.length})\n\n`;
      for (const ref of imports.slice(0, 10)) {
        const icon = categoryIcons[ref.category];
        out += `   ${icon} ${ref.file}:${ref.line}\n`;
        out += `      ${ref.code}\n`;
      }
      if (imports.length > 10) {
        out += `   ... e mais ${imports.length - 10}\n`;
      }
      out += `\n`;
    }

    if (usages.length > 0) {
      out += `⚡ USOS (${usages.length})\n\n`;
      for (const ref of usages.slice(0, 15)) {
        const icon = categoryIcons[ref.category];
        out += `   ${icon} ${ref.file}:${ref.line}\n`;
        out += `      ${ref.code}\n`;
      }
      if (usages.length > 15) {
        out += `   ... e mais ${usages.length - 15}\n`;
      }
      out += `\n`;
    }
  }

  return out;
}

/**
 * Formata resultado do CONTEXT --area para texto
 */
export function formatAreaContextText(result: AreaContextResult): string {
  let out = "";

  out += `\n`;
  out += `╔══════════════════════════════════════════════════════════════╗\n`;
  out += `║                    📦 AREA CONTEXT                          ║\n`;
  out += `╚══════════════════════════════════════════════════════════════╝\n\n`;

  // Header
  out += `📦 ${result.area.name} - Contexto Consolidado (${result.area.fileCount} arquivos)\n`;
  if (result.area.description) {
    out += `   ${result.area.description}\n`;
  }
  out += `\n`;

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Types
  if (result.types.length > 0) {
    out += `🏷️ TYPES (${result.types.length})\n\n`;
    for (const t of result.types) {
      const filePart = t.file.split("/").pop() || t.file;
      out += `   ${t.name}`.padEnd(45) + `[${filePart}:${t.line}]\n`;
      out += `      ${t.definition}\n\n`;
    }
  }

  // Hooks
  if (result.hooks.length > 0) {
    out += `🪝 HOOKS (${result.hooks.length})\n\n`;
    for (const h of result.hooks) {
      const filePart = h.file.split("/").pop() || h.file;
      const params = h.params.length > 0 ? h.params.join(", ") : "";
      out += `   ${h.name}(${params})`.padEnd(45) + `[${filePart}:${h.line}]\n`;
      out += `      → ${h.returns}\n\n`;
    }
  }

  // Functions
  if (result.functions.length > 0) {
    out += `⚡ FUNCTIONS (${result.functions.length})\n\n`;
    for (const f of result.functions) {
      const filePart = f.file.split("/").pop() || f.file;
      const params = f.params.length > 0 ? f.params.join(", ") : "";
      out += `   ${f.name}(${params})`.padEnd(45) + `[${filePart}:${f.line}]\n`;
      out += `      → ${f.returns}\n\n`;
    }
  }

  // Components
  if (result.components.length > 0) {
    out += `🧩 COMPONENTS (${result.components.length})\n\n`;
    for (const c of result.components) {
      const filePart = c.file.split("/").pop() || c.file;
      out += `   ${c.name}`.padEnd(45) + `[${filePart}:${c.line}]\n`;
      if (c.props) {
        out += `      props: ${c.props}\n`;
      }
      out += `\n`;
    }
  }

  // Services
  if (result.services.length > 0) {
    out += `🔧 SERVICES (${result.services.length})\n\n`;
    for (const s of result.services) {
      const filePart = s.file.split("/").pop() || s.file;
      const params = s.params.length > 0 ? s.params.join(", ") : "";
      out += `   ${s.name}(${params})`.padEnd(45) + `[${filePart}:${s.line}]\n`;
      out += `      → ${s.returns}\n\n`;
    }
  }

  // Stores
  if (result.stores.length > 0) {
    out += `🗃️ STORES (${result.stores.length})\n\n`;
    for (const st of result.stores) {
      const filePart = st.file.split("/").pop() || st.file;
      out += `   ${st.name}`.padEnd(45) + `[${filePart}:${st.line}]\n`;
      out += `      state: ${st.state}\n\n`;
    }
  }

  // Triggers (Cloud Functions)
  if (result.triggers && result.triggers.length > 0) {
    out += `⚡ TRIGGERS (${result.triggers.length})\n\n`;
    for (const t of result.triggers) {
      const filePart = t.file.split("/").pop() || t.file;
      out += `   ${t.name}`.padEnd(35) + `${t.triggerType.padEnd(25)}[${filePart}:${t.line}]\n`;
      if (t.triggerPath) {
        out += `      path: ${t.triggerPath}\n`;
      }
      if (t.triggerSchedule) {
        out += `      schedule: ${t.triggerSchedule}\n`;
      }
      out += `\n`;
    }
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Resumo
  out += `📊 RESUMO\n`;
  out += `   Types: ${result.types.length}\n`;
  out += `   Hooks: ${result.hooks.length}\n`;
  out += `   Functions: ${result.functions.length}\n`;
  out += `   Components: ${result.components.length}\n`;
  out += `   Services: ${result.services.length}\n`;
  out += `   Stores: ${result.stores.length}\n`;
  if (result.triggers && result.triggers.length > 0) {
    out += `   Triggers: ${result.triggers.length}\n`;
  }

  return out;
}
