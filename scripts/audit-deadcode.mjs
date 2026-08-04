#!/usr/bin/env node
/**
 * VISÃO — Dead Code Audit (knip wrapper)
 *
 * Executa `knip` com a configuração de `knip.json` e gera relatório agregado
 * em `reports/deadcode/{summary.json, summary.md, raw.json}`.
 *
 * Uso:
 *   node scripts/audit-deadcode.mjs                 # relatório completo
 *   node scripts/audit-deadcode.mjs --format=json   # só JSON no stdout
 *   node scripts/audit-deadcode.mjs --strict        # exit 1 se houver achados
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT_DIR = resolve(ROOT, 'reports/deadcode');

const args = process.argv.slice(2);
const FORMAT = (args.find((a) => a.startsWith('--format=')) || '--format=md').split('=')[1];
const STRICT = args.includes('--strict');
const QUIET = args.includes('--quiet');
const log = (...m) => !QUIET && console.log(...m);

mkdirSync(REPORT_DIR, { recursive: true });

log('→ Executando knip…');
const t0 = Date.now();
const res = spawnSync('npx', ['knip', '--reporter', 'json', '--no-exit-code'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64,
});
const durationMs = Date.now() - t0;

if (res.error) {
  console.error('✖ Falha ao executar knip:', res.error.message);
  process.exit(1);
}

let report;
try {
  const stdout = res.stdout || '';
  const firstBrace = stdout.search(/[\{\[]/);
  report = JSON.parse(firstBrace >= 0 ? stdout.slice(firstBrace) : stdout);
} catch {
  console.error('✖ Não foi possível parsear o JSON do knip.');
  console.error('stderr:', (res.stderr || '').slice(0, 1000));
  process.exit(1);
}

writeFileSync(resolve(REPORT_DIR, 'raw.json'), JSON.stringify(report, null, 2));

const buckets = {
  files: [],
  dependencies: [],
  devDependencies: [],
  optionalPeerDependencies: [],
  unlisted: [],
  unresolved: [],
  exports: [],
  types: [],
  enumMembers: [],
  classMembers: [],
  duplicates: [],
  binaries: [],
};
const SUB_KEYS = Object.keys(buckets).filter((k) => k !== 'files');

const fmtItem = (file, item) => {
  const name = typeof item === 'string' ? item : item?.name || item?.symbol || JSON.stringify(item);
  const line = typeof item === 'object' && item?.line ? `:${item.line}` : '';
  return `${file}${line} — ${name}`;
};

if (Array.isArray(report.files)) buckets.files.push(...report.files);
else if (report.issues && Array.isArray(report.issues.files))
  buckets.files.push(...report.issues.files);

if (Array.isArray(report.issues)) {
  for (const entry of report.issues) {
    const file = entry?.file || '';
    for (const key of SUB_KEYS) {
      const list = entry?.[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) buckets[key].push(fmtItem(file, item));
    }
  }
} else if (report.issues && typeof report.issues === 'object') {
  for (const key of SUB_KEYS) {
    const list = report.issues[key];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      buckets[key].push(typeof item === 'string' ? item : JSON.stringify(item));
    }
  }
}

const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
const total = Object.values(counts).reduce((a, b) => a + b, 0);

const summary = {
  generatedAt: new Date().toISOString(),
  durationMs,
  total,
  counts,
  issues: buckets,
};
writeFileSync(resolve(REPORT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push('# Dead Code Audit (knip)', '');
md.push(`**Gerado em:** ${summary.generatedAt}  `);
md.push(`**Duração:** ${(durationMs / 1000).toFixed(2)}s  `);
md.push(`**Total de achados:** ${total}`, '');
md.push('## Resumo por categoria', '', '| Categoria | Quantidade |', '|-----------|-----------:|');
for (const [k, v] of Object.entries(counts)) md.push(`| ${k} | ${v} |`);
md.push('');

const SECTIONS = [
  ['files', 'Arquivos não utilizados'],
  ['dependencies', 'Dependências não utilizadas'],
  ['devDependencies', 'DevDependencies não utilizadas'],
  ['unlisted', 'Imports não declarados em package.json'],
  ['unresolved', 'Imports não resolvidos'],
  ['exports', 'Exports não utilizados'],
  ['types', 'Tipos não utilizados'],
  ['duplicates', 'Exports duplicados'],
  ['binaries', 'Binários não utilizados'],
];
for (const [key, label] of SECTIONS) {
  const items = buckets[key];
  if (!items?.length) continue;
  md.push(`## ${label} (${items.length})`, '');
  md.push(...items.slice(0, 50).map((it) => `- ${it}`));
  if (items.length > 50) md.push(`- _…e mais ${items.length - 50} itens (ver \`raw.json\`)._`);
  md.push('');
}
if (total === 0) md.push('✅ Nenhum dead code detectado.');
writeFileSync(resolve(REPORT_DIR, 'summary.md'), md.join('\n'));

if (FORMAT === 'json') {
  console.log(JSON.stringify(summary, null, 2));
} else {
  log('');
  log('══════════════════════════════════════════════');
  log(' VISÃO — Dead Code Audit');
  log('══════════════════════════════════════════════');
  for (const [k, v] of Object.entries(counts)) if (v > 0) log(`  • ${k.padEnd(28)} ${v}`);
  log('──────────────────────────────────────────────');
  log(` Total: ${total} achados · ${(durationMs / 1000).toFixed(2)}s`);
  log('──────────────────────────────────────────────');
  log(`📄 Relatórios: reports/deadcode/{summary.json,summary.md,raw.json}`);
}

if (STRICT && total > 0) {
  console.error(`✖ Modo --strict: ${total} achados de dead code.`);
  process.exit(1);
}
process.exit(0);
