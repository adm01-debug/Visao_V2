/**
 * VISÃO - Coverage text report builder
 *
 * Gera um relatório consolidado em texto puro a partir do CoverageReport
 * carregado no dashboard. Útil para download imediato (sempre reflete o
 * JSON atual, mesmo que `public/coverage-report.txt` esteja desatualizado).
 *
 * Estrutura:
 *   - Cabeçalho com timestamp e nº de arquivos.
 *   - Totais por métrica (statements/branches/functions/lines).
 *   - Top N arquivos menos testados (default 20) — destaque para baixa cobertura.
 *   - Lista completa ordenada por menor cobertura de statements.
 */
import type { CoverageReport } from '@/types/coverage';

const fmt = (n: number) => `${n.toFixed(2).padStart(6)}%`;
const fmtPad = (s: string, w: number) => s.padEnd(w);

export interface BuildCoverageTextOptions {
  /** Quantidade de arquivos no bloco "Top menos testados". Default 20. */
  topLimit?: number;
}

export function buildCoverageTextReport(
  report: CoverageReport,
  options: BuildCoverageTextOptions = {}
): string {
  const { topLimit = 20 } = options;
  const { totals, files, generatedAt } = report;

  const sortedAsc = [...files].sort((a, b) => a.statements.pct - b.statements.pct);
  const top = sortedAsc.slice(0, topLimit);

  const lines: string[] = [];
  lines.push('='.repeat(72));
  lines.push('VISÃO — Coverage Report (consolidado)');
  lines.push('='.repeat(72));
  lines.push(`Generated:       ${generatedAt}`);
  lines.push(`Files analyzed:  ${files.length}`);
  lines.push('');
  lines.push('-- TOTAIS --');
  lines.push(
    `  Statements: ${fmt(totals.statements.pct)}  (${totals.statements.covered}/${totals.statements.total})`
  );
  lines.push(
    `  Branches:   ${fmt(totals.branches.pct)}  (${totals.branches.covered}/${totals.branches.total})`
  );
  lines.push(
    `  Functions:  ${fmt(totals.functions.pct)}  (${totals.functions.covered}/${totals.functions.total})`
  );
  lines.push(
    `  Lines:      ${fmt(totals.lines.pct)}  (${totals.lines.covered}/${totals.lines.total})`
  );
  lines.push('');

  lines.push(`-- TOP ${top.length} ARQUIVOS MENOS TESTADOS --`);
  lines.push('');
  lines.push(
    `${fmtPad('Stmts', 8)}${fmtPad('Branch', 8)}${fmtPad('Funcs', 8)}${fmtPad('Lines', 8)} File`
  );
  lines.push('-'.repeat(72));
  for (const f of top) {
    const tag = f.statements.pct < 50 ? ' ⚠' : f.statements.pct < 80 ? ' •' : '';
    lines.push(
      `${fmt(f.statements.pct)} ${fmt(f.branches.pct)} ${fmt(f.functions.pct)} ${fmt(f.lines.pct)}  ${f.path}${tag}`
    );
  }
  lines.push('');
  lines.push('Legenda: ⚠ <50% (crítico)   • 50-79% (atenção)');
  lines.push('');

  lines.push(`-- TODOS OS ARQUIVOS (${files.length}, asc por statements) --`);
  lines.push('');
  lines.push(
    `${fmtPad('Stmts', 8)}${fmtPad('Branch', 8)}${fmtPad('Funcs', 8)}${fmtPad('Lines', 8)} File`
  );
  lines.push('-'.repeat(72));
  for (const f of sortedAsc) {
    lines.push(
      `${fmt(f.statements.pct)} ${fmt(f.branches.pct)} ${fmt(f.functions.pct)} ${fmt(f.lines.pct)}  ${f.path}`
    );
  }
  lines.push('');
  lines.push('='.repeat(72));
  lines.push(`End of report — ${new Date().toISOString()}`);

  return lines.join('\n');
}

export function downloadCoverageTextReport(
  report: CoverageReport,
  options: BuildCoverageTextOptions = {}
): void {
  const text = buildCoverageTextReport(report, options);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `coverage-report-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
