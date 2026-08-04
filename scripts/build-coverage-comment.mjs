#!/usr/bin/env node
/**
 * build-coverage-comment.mjs
 *
 * Gera o corpo (markdown) do comentário idempotente de cobertura no PR.
 *
 * Conteúdo:
 *  1. Tabela de totais (atual x baseline x delta) com veredito do gate.
 *  2. Detalhamento dos arquivos que mais mudaram desde a baseline
 *     (cobertura de linhas), incluindo arquivos novos e removidos.
 *
 * Entradas:
 *   coverage/coverage-summary.json  (vitest run --coverage)
 *   coverage-baseline.json          (versionado no repo)
 *
 * Saída:
 *   arquivo markdown (default: pr-coverage-comment.md) + stdout.
 *
 * Uso:
 *   node scripts/build-coverage-comment.mjs [--out pr-coverage-comment.md] [--top 15]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const BASELINE_PATH = path.join(ROOT, 'coverage-baseline.json');
const METRICS = /** @type {const} */ (['statements', 'branches', 'functions', 'lines']);
/** Marcador HTML que torna o comentário idempotente (update em vez de novo). */
const MARKER = '<!-- lovable:coverage-report -->';

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
}

const OUT_PATH = path.resolve(ROOT, argValue('--out', 'pr-coverage-comment.md'));
const TOP_N = Math.max(1, Number.parseInt(argValue('--top', '15'), 10) || 15);
/** Mudança mínima (pp) para um arquivo aparecer no detalhamento. */
const MIN_DELTA_PP = Number.parseFloat(process.env.COVERAGE_FILE_MIN_DELTA_PP ?? '0.01');

/** @param {string} file */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const summary = readJson(SUMMARY_PATH);
if (!summary?.total) {
  console.error(
    `❌ ${path.relative(ROOT, SUMMARY_PATH)} ausente ou inválido. Rode 'vitest run --coverage' antes.`
  );
  process.exit(1);
}

const baseline = readJson(BASELINE_PATH) ?? {};
const previousMetrics = baseline?.metrics ?? {};
const previousFiles = /** @type {Record<string, number>} */ (baseline?.files ?? {});
const tolerancePp = Number.parseFloat(
  process.env.COVERAGE_TOLERANCE_PP ?? String(baseline?.tolerancePp ?? 0.5)
);

const fmtPct = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(2)}%` : '—');
const fmtDelta = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)} pp`;
const badge = (delta) => {
  if (delta < -tolerancePp) return '🔴';
  if (delta > tolerancePp) return '🟢';
  return '⚪';
};

/* ------------------------------------------------------------------ totais */
const totalRows = [];
let hasRegression = false;

for (const metric of METRICS) {
  const now = summary.total?.[metric]?.pct;
  const before = typeof previousMetrics[metric] === 'number' ? previousMetrics[metric] : null;
  const delta = before === null || typeof now !== 'number' ? 0 : now - before;
  if (delta < -tolerancePp) hasRegression = true;
  totalRows.push(
    `| ${metric} | ${fmtPct(now)} | ${before === null ? '—' : fmtPct(before)} | ${fmtDelta(delta)} | ${badge(delta)} |`
  );
}

/* --------------------------------------------------- detalhamento por arquivo */
/** @type {Record<string, number>} */
const currentFiles = {};
for (const [key, value] of Object.entries(summary)) {
  if (key === 'total') continue;
  const pct = value?.lines?.pct;
  if (typeof pct !== 'number' || !Number.isFinite(pct)) continue;
  const rel = path.relative(ROOT, key).split(path.sep).join('/');
  currentFiles[rel || key] = pct;
}

const allPaths = new Set([...Object.keys(currentFiles), ...Object.keys(previousFiles)]);
/** @type {{file:string;before:number|null;after:number|null;delta:number;kind:"novo"|"removido"|"alterado"}[]} */
const changes = [];

for (const file of allPaths) {
  const after = Object.prototype.hasOwnProperty.call(currentFiles, file)
    ? currentFiles[file]
    : null;
  const before = Object.prototype.hasOwnProperty.call(previousFiles, file)
    ? previousFiles[file]
    : null;

  if (before === null && after !== null) {
    changes.push({ file, before, after, delta: after, kind: 'novo' });
  } else if (after === null && before !== null) {
    changes.push({ file, before, after, delta: -before, kind: 'removido' });
  } else if (before !== null && after !== null) {
    const delta = after - before;
    if (Math.abs(delta) >= MIN_DELTA_PP) {
      changes.push({ file, before, after, delta, kind: 'alterado' });
    }
  }
}

changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.file.localeCompare(b.file));
const top = changes.slice(0, TOP_N);

const baselineHasFiles = Object.keys(previousFiles).length > 0;

let detailSection;
if (!baselineHasFiles) {
  detailSection =
    '> ℹ️ A baseline ainda não contém o snapshot por arquivo. ' +
    'Rode `npm run coverage:baseline` e commite o `coverage-baseline.json` ' +
    'para habilitar o detalhamento de linhas/arquivos.';
} else if (top.length === 0) {
  detailSection = 'Nenhum arquivo mudou de cobertura desde a baseline. ✅';
} else {
  const rows = top.map(
    (c) =>
      `| \`${c.file}\` | ${c.kind} | ${c.before === null ? '—' : fmtPct(c.before)} | ${c.after === null ? '—' : fmtPct(c.after)} | ${fmtDelta(c.delta)} | ${badge(c.delta)} |`
  );
  const extra =
    changes.length > top.length
      ? `\n\n_+${changes.length - top.length} arquivo(s) com variação menor omitidos._`
      : '';
  detailSection =
    [
      `Top ${top.length} de ${changes.length} arquivo(s) com maior variação de **cobertura de linhas**:`,
      '',
      '| Arquivo | Tipo | Baseline | Atual | Δ | |',
      '| --- | --- | ---: | ---: | ---: | :--: |',
      ...rows,
    ].join('\n') + extra;
}

/* ------------------------------------------------------------------- corpo */
const verdict = hasRegression
  ? `🔴 **Regressão de cobertura** (tolerância ${tolerancePp.toFixed(2)} pp).`
  : `✅ **Sem regressão de cobertura** (tolerância ${tolerancePp.toFixed(2)} pp).`;

const body = [
  MARKER,
  '## 📊 Cobertura de testes',
  '',
  verdict,
  '',
  '| Métrica | Atual | Baseline | Δ | |',
  '| --- | ---: | ---: | ---: | :--: |',
  ...totalRows,
  '',
  '<details open>',
  '<summary><b>Arquivos que mais mudaram desde a baseline</b></summary>',
  '',
  detailSection,
  '',
  '</details>',
  '',
  `<sub>Baseline de ${baseline?.updatedAt ?? '—'} · gerado automaticamente pelo CI.</sub>`,
  '',
].join('\n');

fs.writeFileSync(OUT_PATH, body, 'utf8');
console.log(body);
console.error(`\n📝 Comentário gravado em ${path.relative(ROOT, OUT_PATH)}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`, 'utf8');
}
