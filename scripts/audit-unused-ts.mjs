#!/usr/bin/env node
/**
 * VISÃO — Dead code (fluxo alternativo ao knip)
 *
 * Usa `ts-prune` (via npx) para listar exports não referenciados no projeto,
 * filtra falsos-positivos conhecidos e gera `reports/deadcode/ts-prune.md` +
 * `ts-prune.json`.
 *
 * Funciona sem instalação prévia (npx baixa on-demand).
 *
 * Uso:
 *   node scripts/audit-unused-ts.mjs
 *   node scripts/audit-unused-ts.mjs --strict   # exit 1 se houver achados
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'reports/deadcode');
const STRICT = process.argv.includes('--strict');

// Padrões a ignorar (falsos-positivos arquiteturais + entrypoints)
const IGNORE_FILES = [
  /^src\/integrations\/supabase\/(client|types)\.ts$/,
  /^src\/components\/ui\//,
  /^src\/main\.tsx$/,
  /^src\/App\.tsx$/,
  /^src\/vite-env\.d\.ts$/,
  /^supabase\/functions\//,
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.stories\.(ts|tsx)$/,
];
const IGNORE_EXPORTS = new Set(['default', 'metadata']);

mkdirSync(OUT, { recursive: true });

console.log('→ Executando ts-prune (via npx)…');
const res = spawnSync(
  'npx',
  ['-y', 'ts-prune', '-p', 'tsconfig.app.json', '--error'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
);

// ts-prune retorna exit 1 quando encontra achados — isso é normal, não é falha.
const raw = (res.stdout || '') + (res.stderr || '');
if (res.error) {
  console.error('✖ Falha ao executar ts-prune:', res.error.message);
  process.exit(1);
}

const lines = raw
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && /:\d+ - /.test(l));

const parsed = lines.map((line) => {
  // formato: src/foo/bar.ts:12 - myExport
  const m = line.match(/^(.+?):(\d+) - (.+?)(\s+\(used in module\))?$/);
  if (!m) return null;
  return {
    file: m[1],
    line: Number(m[2]),
    exportName: m[3].trim(),
    usedInModule: Boolean(m[4]),
  };
}).filter(Boolean);

const filtered = parsed.filter((r) => {
  if (r.usedInModule) return false; // usado internamente
  if (IGNORE_EXPORTS.has(r.exportName)) return false;
  return !IGNORE_FILES.some((rx) => rx.test(r.file));
});

const byFile = filtered.reduce((acc, r) => {
  (acc[r.file] ??= []).push(r);
  return acc;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  total: filtered.length,
  totalRaw: parsed.length,
  files: Object.keys(byFile).length,
  entries: filtered,
};

writeFileSync(resolve(OUT, 'ts-prune.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push('# Dead exports (ts-prune)', '');
md.push(`**Gerado em:** ${summary.generatedAt}  `);
md.push(`**Total após filtros:** ${summary.total} (${summary.totalRaw} brutos)  `);
md.push(`**Arquivos afetados:** ${summary.files}`, '');
if (summary.total === 0) {
  md.push('✅ Nenhum export órfão fora de allowlist.');
} else {
  md.push('| Arquivo | Linha | Export |');
  md.push('|---|---:|---|');
  for (const r of filtered.slice(0, 200)) {
    md.push(`| \`${r.file}\` | ${r.line} | \`${r.exportName}\` |`);
  }
  if (filtered.length > 200) md.push(`\n_…e mais ${filtered.length - 200} entradas em \`ts-prune.json\`._`);
}
writeFileSync(resolve(OUT, 'ts-prune.md'), md.join('\n'));

console.log('══════════════════════════════════════════════');
console.log(' VISÃO — Dead exports (ts-prune)');
console.log('══════════════════════════════════════════════');
console.log(`  • Brutos ..... ${summary.totalRaw}`);
console.log(`  • Filtrados .. ${summary.total}`);
console.log(`  • Arquivos ... ${summary.files}`);
console.log('──────────────────────────────────────────────');
console.log(' Relatório: reports/deadcode/ts-prune.{md,json}');

if (STRICT && summary.total > 0) {
  console.error(`✖ Modo --strict: ${summary.total} exports órfãos.`);
  process.exit(1);
}
process.exit(0);
