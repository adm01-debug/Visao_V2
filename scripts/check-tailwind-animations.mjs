#!/usr/bin/env node
/**
 * check-tailwind-animations.mjs
 *
 * Post-build guard: verifies that critical Tailwind keyframes and animation
 * utility classes survived CSS purging in the production bundle.
 *
 * Run after `vite build`. Exits with code 1 if any required animation is missing.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST_ASSETS = resolve(process.cwd(), 'dist', 'assets');

const REQUIRED = [
  { keyframe: 'shimmer', utility: 'animate-shimmer' },
  { keyframe: 'skeleton-brand-pulse', utility: 'animate-skeleton-brand-pulse' },
  { keyframe: 'pulse-glow', utility: 'animate-pulse-glow' },
  { keyframe: 'card-enter', utility: 'animate-card-enter' },
  { keyframe: 'sheen', utility: 'animate-sheen' },
  { keyframe: 'accordion-down', utility: 'animate-accordion-down' },
  { keyframe: 'accordion-up', utility: 'animate-accordion-up' },
];

function fail(msg) {
  console.error(`\n❌ check:tailwind-animations — ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ check:tailwind-animations — ${msg}`);
}

if (!existsSync(DIST_ASSETS)) {
  fail(`dist/assets not found. Run \`vite build\` first. Looked at: ${DIST_ASSETS}`);
}

const cssFiles = readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) {
  fail('No CSS files found in dist/assets.');
}

const combinedCss = cssFiles
  .map((f) => readFileSync(join(DIST_ASSETS, f), 'utf8'))
  .join('\n');

const missing = [];
for (const { keyframe, utility } of REQUIRED) {
  const hasKeyframe = new RegExp(`@keyframes\\s+${keyframe}\\b`).test(combinedCss);
  const hasUtility = combinedCss.includes(`.${utility}`);
  if (!hasKeyframe || !hasUtility) {
    missing.push({ keyframe, utility, hasKeyframe, hasUtility });
  }
}

if (missing.length > 0) {
  console.error('\n❌ Missing Tailwind animations in production bundle:\n');
  for (const m of missing) {
    console.error(
      `  - ${m.utility} (keyframe @${m.keyframe}): keyframe=${m.hasKeyframe ? 'OK' : 'MISSING'}, utility=${m.hasUtility ? 'OK' : 'MISSING'}`
    );
  }
  console.error(
    '\nFix: ensure these classes are referenced in source (or safelisted in tailwind.config.ts).\n'
  );
  process.exit(1);
}

ok(`All ${REQUIRED.length} required animations present in ${cssFiles.length} CSS file(s).`);
