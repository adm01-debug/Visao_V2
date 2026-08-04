#!/usr/bin/env node
/**
 * VISÃO — Compara `reports/deadcode/summary.json` (atual) contra
 * `reports/deadcode/baseline.json` (commitado) e reporta regressões por
 * categoria. Em modo --warn nunca falha; em --strict, sai com código 1
 * quando alguma categoria piora.
 *
 * Uso:
 *   node scripts/check-deadcode-baseline.mjs            # warn-only (default)
 *   node scripts/check-deadcode-baseline.mjs --strict   # exit 1 em regressão
 *   node scripts/check-deadcode-baseline.mjs --update   # sobrescreve baseline
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY = resolve(ROOT, 'reports/deadcode/summary.json');
const BASELINE = resolve(ROOT, 'reports/deadcode/baseline.json');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const UPDATE = args.includes('--update');

if (!existsSync(SUMMARY)) {
  console.error('✖ summary.json não encontrado. Rode `npm run audit:deadcode` primeiro.');
  process.exit(1);
}
const current = JSON.parse(readFileSync(SUMMARY, 'utf8'));

if (UPDATE) {
  const baseline = {
    generatedAt: current.generatedAt,
    total: current.total,
    counts: current.counts,
    note: 'Baseline gerado para detectar regressões. Atualize via: npm run audit:deadcode:baseline',
  };
  writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✅ Baseline atualizado (total=${baseline.total}).`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.warn('⚠ baseline.json não existe. Gere com `--update`.');
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));

const categories = new Set([
  ...Object.keys(baseline.counts || {}),
  ...Object.keys(current.counts || {}),
]);
const rows = [];
let regressed = 0;
let improved = 0;

for (const k of [...categories].sort()) {
  const b = baseline.counts?.[k] ?? 0;
  const c = current.counts?.[k] ?? 0;
  const delta = c - b;
  if (delta > 0) regressed += delta;
  else if (delta < 0) improved += -delta;
  rows.push({ category: k, baseline: b, current: c, delta });
}
const totalDelta = (current.total ?? 0) - (baseline.total ?? 0);

console.log('\n══════════════════════════════════════════════');
console.log(' VISÃO — Knip baseline check');
console.log('══════════════════════════════════════════════');
console.log(` Baseline: ${baseline.generatedAt}  (total=${baseline.total})`);
console.log(` Current:  ${current.generatedAt}  (total=${current.total})`);
console.log('──────────────────────────────────────────────');
const pad = (s, n) => String(s).padEnd(n);
console.log(` ${pad('Categoria', 26)} ${pad('base', 6)} ${pad('now', 6)} delta`);
for (const r of rows) {
  const arrow = r.delta > 0 ? '▲' : r.delta < 0 ? '▼' : '·';
  console.log(
    ` ${pad(r.category, 26)} ${pad(r.baseline, 6)} ${pad(r.current, 6)} ${arrow} ${r.delta}`
  );
}
console.log('──────────────────────────────────────────────');
console.log(` Δ total: ${totalDelta}  (regrediu ${regressed} · melhorou ${improved})`);
console.log('══════════════════════════════════════════════\n');

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  const lines = [
    '## Knip baseline check',
    '',
    `- **Baseline:** \`${baseline.generatedAt}\` (total=${baseline.total})`,
    `- **Current:** \`${current.generatedAt}\` (total=${current.total})`,
    `- **Δ total:** ${totalDelta} (regrediu ${regressed} · melhorou ${improved})`,
    '',
    '| Categoria | Baseline | Atual | Δ |',
    '|---|---:|---:|---:|',
    ...rows.map((r) => `| ${r.category} | ${r.baseline} | ${r.current} | ${r.delta} |`),
  ];
  try {
    writeFileSync(summaryFile, lines.join('\n') + '\n', { flag: 'a' });
  } catch {
    // ignore
  }
}

if (STRICT && regressed > 0) {
  console.error(`✖ Regressão detectada: +${regressed} achados acima do baseline.`);
  process.exit(1);
}
process.exit(0);
