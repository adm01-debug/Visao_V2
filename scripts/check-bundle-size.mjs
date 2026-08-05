#!/usr/bin/env node
/**
 * Bundle Size Budget — falha o CI quando chunks JS excedem o orçamento.
 *
 * Limites (calibrados com margem de ~25% sobre o estado atual — 2026-08-05):
 *   - Chunk individual: 2200 KB raw / 600 KB gzipped
 *     (vendor-mapbox ~1786 KB, vendor-ml ~1724 KB — grandes libs estabelecidas)
 *   - Total JS: 10 MB raw / 3000 KB gzipped
 *     (145 chunks, total ~8.47 MB raw — inclui mapbox, ml, pdf, hls)
 *
 * Para ajustar limites quando houver crescimento legítimo, edite LIMITS
 * abaixo e documente o motivo no commit.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMITS = {
  perChunk: 2200 * 1024,      // vendor-mapbox / vendor-ml ~1750 KB; 25% headroom
  perChunkGz: 600 * 1024,     // vendor-mapbox gzipped ~486 KB; 25% headroom
  totalJs: 10 * 1024 * 1024,  // current ~8.47 MB; 18% headroom
  totalJsGz: 3000 * 1024,     // current ~2407 KB gzipped; 25% headroom
};

const dir = 'dist/assets';

if (!existsSync(dir)) {
  console.error(`❌ Diretório ${dir} não existe. Rode "npm run build" antes.`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
if (files.length === 0) {
  console.error(`❌ Nenhum chunk JS encontrado em ${dir}.`);
  process.exit(1);
}

const errors = [];
const report = [];
let totalRaw = 0;
let totalGz = 0;

for (const f of files) {
  const buf = readFileSync(join(dir, f));
  const raw = buf.length;
  const gz = gzipSync(buf).length;
  totalRaw += raw;
  totalGz += gz;
  report.push({ file: f, raw, gz });
  if (raw > LIMITS.perChunk) {
    errors.push(`Chunk "${f}": ${(raw / 1024).toFixed(0)} KB > ${LIMITS.perChunk / 1024} KB (raw)`);
  }
  if (gz > LIMITS.perChunkGz) {
    errors.push(
      `Chunk "${f}" gzipped: ${(gz / 1024).toFixed(0)} KB > ${LIMITS.perChunkGz / 1024} KB`
    );
  }
}

if (totalRaw > LIMITS.totalJs) {
  errors.push(
    `Total JS: ${(totalRaw / 1024 / 1024).toFixed(2)} MB > ${LIMITS.totalJs / 1024 / 1024} MB (raw)`
  );
}
if (totalGz > LIMITS.totalJsGz) {
  errors.push(
    `Total JS gzipped: ${(totalGz / 1024).toFixed(0)} KB > ${LIMITS.totalJsGz / 1024} KB`
  );
}

// Top 5 maiores chunks (sempre logar para visibilidade)
const top5 = [...report].sort((a, b) => b.raw - a.raw).slice(0, 5);
console.log('\n📦 Top 5 chunks (raw / gzipped):');
for (const { file, raw, gz } of top5) {
  console.log(
    `   ${(raw / 1024).toFixed(0).padStart(5)} KB / ${(gz / 1024).toFixed(0).padStart(4)} KB  —  ${file}`
  );
}
console.log(
  `\n   Total: ${(totalRaw / 1024 / 1024).toFixed(2)} MB raw / ${(totalGz / 1024).toFixed(0)} KB gzipped (${files.length} chunks)`
);

if (errors.length > 0) {
  console.error('\n❌ Bundle size budget exceeded:');
  for (const e of errors) console.error(`   • ${e}`);
  console.error(
    '\nPara ajustar os limites, edite scripts/check-bundle-size.mjs (LIMITS) e justifique no commit.\n'
  );
  process.exit(1);
}

console.log('\n✅ Bundle dentro do orçamento.\n');
