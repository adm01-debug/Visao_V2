#!/usr/bin/env node
/**
 * Chunk Size Report — gera relatório de tamanho de chunks pós-build.
 *
 * Uso:
 *   node scripts/chunk-size-report.mjs               # falha se houver alerta
 *   node scripts/chunk-size-report.mjs --warn-only   # apenas avisa
 *   THRESHOLD_KB=750 node scripts/chunk-size-report.mjs
 *
 * Saídas:
 *   - stdout: tabela + alertas
 *   - reports/bundle/chunks.md (Markdown consumível em PRs)
 *   - reports/bundle/chunks.json (dados brutos)
 *
 * Regra de alerta:
 *   Qualquer chunk JS com tamanho raw > THRESHOLD_KB (padrão 500 kB) dispara
 *   ⚠️  ALERTA. Chunks lazy identificados por padrão (`vendor-*`, prefixo `chunk-`,
 *   ou nome contendo `lazy`) são reportados como WARN e não falham o build —
 *   representam código carregado sob demanda cujo peso já é isolado do bundle
 *   inicial. Chunks não-lazy acima do limite falham (exit 1).
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { join } from 'node:path';

const THRESHOLD_KB = Number(process.env.THRESHOLD_KB ?? 500);
const THRESHOLD = THRESHOLD_KB * 1024;
const WARN_ONLY = process.argv.includes('--warn-only');

const DIST = 'dist/assets';
const OUT_DIR = 'reports/bundle';

if (!existsSync(DIST)) {
  console.error(`❌ ${DIST} não existe. Rode "npm run build" antes.`);
  process.exit(1);
}

const LAZY_PATTERNS = [/^vendor-/i, /^chunk-/i, /lazy/i];
const isLazyChunk = (name) => LAZY_PATTERNS.some((re) => re.test(name));

const files = readdirSync(DIST).filter((f) => f.endsWith('.js'));
const chunks = files
  .map((f) => {
    const buf = readFileSync(join(DIST, f));
    return {
      file: f,
      raw: buf.length,
      gz: gzipSync(buf).length,
      br: brotliCompressSync(buf).length,
      lazy: isLazyChunk(f),
    };
  })
  .sort((a, b) => b.raw - a.raw);

const kb = (n) => (n / 1024).toFixed(1);

const alerts = chunks.filter((c) => c.raw > THRESHOLD);
const blocking = alerts.filter((c) => !c.lazy);

const totalRaw = chunks.reduce((s, c) => s + c.raw, 0);
const totalGz = chunks.reduce((s, c) => s + c.gz, 0);

// --------- stdout ---------
console.log(`\n📦 Chunk Size Report  (limite: ${THRESHOLD_KB} kB raw)\n`);
console.log('   raw kB │  gz kB │  br kB │ tipo  │ chunk');
console.log('  ───────┼────────┼────────┼───────┼──────────────────────────────');
for (const c of chunks) {
  const flag = c.raw > THRESHOLD ? (c.lazy ? '⚠️ WARN' : '❌ FAIL') : '  ok  ';
  console.log(
    `  ${kb(c.raw).padStart(6)} │ ${kb(c.gz).padStart(6)} │ ${kb(c.br).padStart(6)} │ ${(c.lazy ? 'lazy' : 'eager').padEnd(5)} │ ${flag} ${c.file}`
  );
}
console.log(
  `\n   Total: ${(totalRaw / 1024 / 1024).toFixed(2)} MB raw / ${kb(totalGz)} kB gz  (${chunks.length} chunks)`
);

if (alerts.length) {
  console.log(`\n⚠️  ${alerts.length} chunk(s) acima de ${THRESHOLD_KB} kB:`);
  for (const c of alerts) {
    console.log(
      `   ${c.lazy ? '⚠️ ' : '❌ '}${c.file}  —  ${kb(c.raw)} kB raw / ${kb(c.gz)} kB gz  (${c.lazy ? 'lazy — ok se carregado sob demanda' : 'EAGER — reduzir ou lazy-load'})`
    );
  }
} else {
  console.log(`\n✅ Nenhum chunk acima de ${THRESHOLD_KB} kB.`);
}

// --------- artefatos ---------
mkdirSync(OUT_DIR, { recursive: true });

const md = [
  `# Chunk Size Report`,
  ``,
  `- Limite de alerta: **${THRESHOLD_KB} kB** (raw)`,
  `- Total: **${(totalRaw / 1024 / 1024).toFixed(2)} MB raw** / **${kb(totalGz)} kB gz** em ${chunks.length} chunks`,
  `- Alertas: **${alerts.length}** (${blocking.length} bloqueantes / ${alerts.length - blocking.length} lazy)`,
  ``,
  `## Todos os chunks`,
  ``,
  `| Chunk | raw (kB) | gz (kB) | br (kB) | Tipo | Status |`,
  `| --- | ---: | ---: | ---: | :---: | :---: |`,
  ...chunks.map(
    (c) =>
      `| \`${c.file}\` | ${kb(c.raw)} | ${kb(c.gz)} | ${kb(c.br)} | ${c.lazy ? 'lazy' : 'eager'} | ${c.raw > THRESHOLD ? (c.lazy ? '⚠️ warn' : '❌ fail') : '✅'} |`
  ),
  ``,
  alerts.length ? `## ⚠️ Alertas (> ${THRESHOLD_KB} kB)` : `## ✅ Sem alertas`,
  ``,
  ...(alerts.length
    ? alerts.map(
        (c) =>
          `- ${c.lazy ? '⚠️' : '❌'} \`${c.file}\` — ${kb(c.raw)} kB raw${c.lazy ? ' (lazy)' : ' (**eager — reduzir**)'}`
      )
    : []),
  ``,
].join('\n');

writeFileSync(join(OUT_DIR, 'chunks.md'), md);
writeFileSync(
  join(OUT_DIR, 'chunks.json'),
  JSON.stringify(
    { thresholdKB: THRESHOLD_KB, totalRaw, totalGz, chunks, alerts, blocking },
    null,
    2
  )
);

console.log(`\n📝 ${OUT_DIR}/chunks.md  +  ${OUT_DIR}/chunks.json`);

if (blocking.length && !WARN_ONLY) {
  console.error(
    `\n❌ ${blocking.length} chunk(s) EAGER acima de ${THRESHOLD_KB} kB. Aplique lazy-load ou split. (use --warn-only para não falhar)`
  );
  process.exit(1);
}
