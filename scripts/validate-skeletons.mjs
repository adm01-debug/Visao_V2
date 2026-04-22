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
import { join } from 'node:path';

const SKIP_BUILD = process.argv.includes('--skip-build');
const startedAt = Date.now();

const TARGET_PAGES = [
  'src/pages/CamerasPage.tsx',
  'src/pages/AlertsPage.tsx',
  'src/pages/ZonesPage.tsx',
];
const SKELETON_DIR = 'src/components/skeletons';
const TRACKED_SYMBOLS = [
  'Skeleton',
  'BrandedSkeleton',
  'CameraSkeleton',
  'AlertSkeleton',
  'StatSkeleton',
  'CamerasSkeleton',
  'AlertsSkeleton',
  'ZonesSkeleton',
  'FiltersBarSkeleton',
  'TabsSkeleton',
];

function listSkeletonFiles() {
  try {
    return readdirSync(SKELETON_DIR)
      .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
      .map((f) => join(SKELETON_DIR, f));
  } catch {
    return [];
  }
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

function checkOrphanImports() {
  process.stdout.write('▶ orphan-import scan… ');
  const files = [...TARGET_PAGES, ...listSkeletonFiles()];
  const offenders = [];

  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    // Coleta símbolos importados de fontes relevantes (ui/skeleton ou skeletons/*)
    const importRegex =
      /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"](@\/components\/(?:ui\/skeleton|skeletons\/[^'"]+))['"]/g;
    const imported = new Set();
    let m;
    while ((m = importRegex.exec(src))) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/i).pop()?.trim();
        if (name && TRACKED_SYMBOLS.includes(name)) imported.add(name);
      }
    }

    if (imported.size === 0) continue;

    // Remove blocos de import + comentários de linha + strings simples
    const stripped = src
      .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    for (const sym of imported) {
      // Uso real: <Sym, Sym(, Sym., Sym} (destructure), Sym, (lista)
      const usageRe = new RegExp(`(?:<|\\b)${sym}(?:\\b|>|\\.|\\(|\\s|,|})`);
      if (!usageRe.test(stripped)) {
        offenders.push(`${file} → ${sym}`);
      }
    }
  }

  if (offenders.length) {
    console.log('✗');
    console.error(`\n--- imports órfãos detectados ---`);
    for (const o of offenders) console.error(`   - ${o}`);
    console.error(
      `\nRemova o import ou utilize o símbolo no JSX. Símbolos rastreados: ${TRACKED_SYMBOLS.join(', ')}.\n`,
    );
    process.exit(1);
  }
  console.log('✓');
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
