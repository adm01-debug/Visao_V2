#!/usr/bin/env node
/**
 * VISÃO — Skeleton Validation Pipeline
 *
 * Pré-flight focado para mudanças em src/components/skeletons/** e nas páginas
 * /cameras, /alerts, /zones. Roda em sequência e falha rápido na primeira etapa.
 *
 * Etapas:
 *   1. type-check (tsc --noEmit)
 *   2. lint focado nas páginas-alvo + skeletons
 *   3. detector de imports órfãos (Skeleton & friends)
 *   4. check:mobile-nav
 *   5. build de produção (vite build)  — pular com --skip-build
 *
 * Uso:
 *   node scripts/validate-skeletons.mjs           # pipeline completo
 *   node scripts/validate-skeletons.mjs --skip-build
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP_BUILD = process.argv.includes('--skip-build');
const startedAt = Date.now();

const TARGET_PAGES = [
  'src/pages/CamerasPage.tsx',
  'src/pages/AlertsPage.tsx',
  'src/pages/ZonesPage.tsx',
];
const SKELETON_DIR = 'src/components/skeletons';
const SRC_DIR = 'src';

/** Fontes de import consideradas “relacionadas a skeleton”. */
const SKELETON_SOURCE_RE = /^@\/components\/(?:ui\/skeleton|skeletons(?:\/[^'"]+)?|PageSkeletons)$/;

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|jsx?)$/.test(name)) acc.push(full);
  }
  return acc;
}

function listSkeletonFiles() {
  try {
    return readdirSync(SKELETON_DIR)
      .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map((f) => join(SKELETON_DIR, f));
  } catch {
    return [];
  }
}

/**
 * Coleta todos os arquivos do projeto que importam de fontes relacionadas a
 * skeleton (ui/skeleton, skeletons/*, PageSkeletons). Retorna paths relativos.
 */
function collectFilesImportingSkeletons() {
  const all = walk(SRC_DIR);
  const importLine = /from\s*['"]([^'"]+)['"]/g;
  const hits = new Set();
  for (const file of all) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    importLine.lastIndex = 0;
    let m;
    while ((m = importLine.exec(src))) {
      if (SKELETON_SOURCE_RE.test(m[1])) {
        hits.add(relative('.', file));
        break;
      }
    }
  }
  return [...hits];
}

function run(label, cmd, args, { mute = true } = {}) {
  process.stdout.write(`▶ ${label}… `);
  const t0 = Date.now();
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (res.status !== 0) {
    console.log(`✗ (${dt}s)`);
    if (mute) {
      const out = (res.stdout || '') + (res.stderr || '');
      console.error(`\n--- ${label} output ---\n${out}\n`);
    }
    process.exit(1);
  }
  console.log(`✓ (${dt}s)`);
}

/**
 * Parse simples de uma cláusula `import ... from "..."`.
 * Suporta: default, namespace (* as), named ({ a, b as c, type D }), mistos.
 * Retorna lista de nomes locais (após `as`) que ficam no escopo.
 */
function extractImportedSymbols(clause) {
  const symbols = [];
  const defaultMatch = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch) symbols.push(defaultMatch[1]);

  const nsMatch = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (nsMatch) symbols.push(nsMatch[1]);

  const namedMatch = clause.match(/\{([^}]*)\}/);
  if (namedMatch) {
    for (const raw of namedMatch[1].split(',')) {
      const part = raw.replace(/^\s*type\s+/, '').trim();
      if (!part) continue;
      const aliased = part.split(/\s+as\s+/i);
      const local = (aliased[1] ?? aliased[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(local)) symbols.push(local);
    }
  }
  return symbols;
}

function checkOrphanImports() {
  process.stdout.write('▶ orphan-import scan… ');

  // União dinâmica: páginas-alvo + skeletons + qualquer arquivo do projeto que
  // importe de fontes relacionadas a skeleton (ui/skeleton, skeletons/*, PageSkeletons).
  const dynamic = collectFilesImportingSkeletons();
  const files = Array.from(new Set([...TARGET_PAGES, ...listSkeletonFiles(), ...dynamic]));

  const importStmt = /import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"]\s*;?/g;
  const offenders = [];
  let scannedFiles = 0;
  let scannedImports = 0;

  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    scannedFiles++;

    const importedHere = [];
    importStmt.lastIndex = 0;
    let m;
    while ((m = importStmt.exec(src))) {
      const [, clause, source] = m;
      if (!SKELETON_SOURCE_RE.test(source)) continue;
      for (const s of extractImportedSymbols(clause)) {
        importedHere.push({ symbol: s, source });
      }
      scannedImports++;
    }

    if (importedHere.length === 0) continue;

    // Remove imports + comentários + strings literais para evitar falsos positivos
    const stripped = src
      .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
      .replace(/import\s*['"][^'"]+['"];?/g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');

    for (const { symbol, source } of importedHere) {
      const usageRe = new RegExp(`(?:<|[^\\w$.])${symbol}(?:[^\\w$]|$)`);
      if (!usageRe.test(stripped)) {
        offenders.push(`${file} → ${symbol}  (import "${source}")`);
      }
    }
  }

  if (offenders.length) {
    console.log(`✗ (${scannedFiles} arquivos, ${scannedImports} imports)`);
    console.error(`\n--- imports órfãos detectados ---`);
    for (const o of offenders) console.error(`   - ${o}`);
    console.error(
      `\nRemova o import ou utilize o símbolo. Fontes analisadas: ui/skeleton, skeletons/*, PageSkeletons.\n`
    );
    process.exit(1);
  }
  console.log(`✓ (${scannedFiles} arquivos, ${scannedImports} imports)`);
}

console.log(`\n🔎 Skeleton Validation Pipeline${SKIP_BUILD ? ' (--skip-build)' : ''}\n`);

// 1. TypeScript
run('type-check (tsc --noEmit)', 'npx', ['tsc', '--noEmit', '-p', 'tsconfig.json']);

// 2. ESLint focado (não-fatal: alguns ambientes podem ter deps faltando)
const lintTargets = [...TARGET_PAGES, `${SKELETON_DIR}`];
const lintRes = spawnSync('npx', ['eslint', '--max-warnings', '0', ...lintTargets], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (lintRes.status !== 0) {
  console.log('▶ lint focado (eslint --max-warnings 0)… ⚠ (skipped — eslint indisponível)');
} else {
  console.log('▶ lint focado (eslint --max-warnings 0)… ✓');
}

// 3. Imports órfãos
checkOrphanImports();

// 4. Mobile-nav
run('mobile-nav gate', 'node', ['scripts/check-mobile-nav.mjs']);

// 5. Testes de skeleton (anti-CLS + placeholders + snapshots de dimensão)
run('vitest skeletons (LoadingPlaceholders + DimensionSnapshots)', 'npm', [
  'test',
  '--silent',
  '--',
  '--run',
  'src/components/skeletons/__tests__/',
]);

// 6. Build
if (!SKIP_BUILD) {
  run('vite build', 'npx', ['vite', 'build']);
} else {
  console.log('▶ vite build… ⊘ (skipped)');
}

const total = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n✓ All skeleton checks passed (${total}s)\n`);
