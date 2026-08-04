#!/usr/bin/env node
/**
 * VISÃO — Bundle report summary.
 *
 * Lê dist/stats/report.json (gerado por rollup-plugin-visualizer em
 * ANALYZE=1) e imprime tabelas Markdown:
 *   1. Top chunks por tamanho (parsed / gzip / brotli).
 *   2. Top dependências npm que mais pesam agregando entre chunks.
 *   3. Sinais automáticos: dep > 300kB em chunk não-lazy, duplicações etc.
 *
 * Saída padrão: stdout. Salva também reports/bundle/summary.md.
 * Uso: node scripts/bundle-report.mjs [--json]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT = resolve(ROOT, 'dist/stats/report.json');
const OUT_DIR = resolve(ROOT, 'reports/bundle');
const OUT_MD = resolve(OUT_DIR, 'summary.md');

if (!existsSync(REPORT)) {
  console.error(`❌ ${REPORT} não encontrado. Rode: ANALYZE=1 bun run build`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(REPORT, 'utf8'));
// raw shape (rollup-plugin-visualizer v7 raw-data):
//   { tree: { children: [chunk...] }, nodeParts: {…}, nodeMetas: {…}, env }
// Simplificamos: aceitamos ambos formatos (v6/v7).
const chunks = extractChunks(raw);
const bytesFor = (c, kind) => c.parts.reduce((s, p) => s + (p[kind] ?? 0), 0);
const kb = (n) => (n / 1024).toFixed(1) + ' kB';

// ---------- 1) Top chunks ----------
const chunkRows = chunks
  .map((c) => ({
    name: c.name,
    parsed: bytesFor(c, 'renderedLength'),
    gzip: bytesFor(c, 'gzipLength'),
    brotli: bytesFor(c, 'brotliLength'),
    modules: c.parts.length,
  }))
  .sort((a, b) => b.parsed - a.parsed);

// ---------- 2) Top deps (agregado entre chunks) ----------
const depTotals = new Map();
for (const c of chunks) {
  for (const p of c.parts) {
    const dep = depOf(p.id);
    if (!dep) continue;
    const cur = depTotals.get(dep) ?? { name: dep, parsed: 0, chunks: new Set() };
    cur.parsed += p.renderedLength ?? 0;
    cur.chunks.add(c.name);
    depTotals.set(dep, cur);
  }
}
const depRows = [...depTotals.values()]
  .map((d) => ({ ...d, chunks: [...d.chunks] }))
  .sort((a, b) => b.parsed - a.parsed);

// ---------- 3) Sinais automáticos ----------
const signals = [];
for (const d of depRows.slice(0, 40)) {
  if (d.parsed > 300 * 1024 && !d.chunks.every((c) => /vendor-|Page|lazy/i.test(c))) {
    signals.push(
      `⚠️  \`${d.name}\` (${kb(d.parsed)}) aparece em chunks não-lazy: ${d.chunks.join(', ')}`
    );
  }
  if (d.chunks.length > 2) {
    signals.push(
      `ℹ️  \`${d.name}\` duplicada em ${d.chunks.length} chunks: ${d.chunks.join(', ')}`
    );
  }
}

// ---------- Output ----------
const md = [];
md.push('# Bundle Report — VISÃO', '');
md.push(`Gerado em ${new Date().toISOString()} a partir de \`dist/stats/report.json\`.`, '');
md.push('## Top 20 chunks', '');
md.push('| Chunk | Parsed | Gzip | Brotli | Módulos |');
md.push('|---|---:|---:|---:|---:|');
for (const r of chunkRows.slice(0, 20)) {
  md.push(`| \`${r.name}\` | ${kb(r.parsed)} | ${kb(r.gzip)} | ${kb(r.brotli)} | ${r.modules} |`);
}
md.push('', '## Top 20 dependências (soma entre chunks)', '');
md.push('| Dep | Parsed | Chunks |');
md.push('|---|---:|---|');
for (const r of depRows.slice(0, 20)) {
  md.push(`| \`${r.name}\` | ${kb(r.parsed)} | ${r.chunks.join(', ')} |`);
}
md.push('', '## Sinais', '');
md.push(signals.length ? signals.map((s) => `- ${s}`).join('\n') : '_Nenhum sinal detectado._');

const output = md.join('\n') + '\n';
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_MD, output);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ chunks: chunkRows, deps: depRows, signals }, null, 2));
} else {
  console.log(output);
  console.log(`✔ Salvo em ${OUT_MD}`);
  console.log(`✔ Treemap: dist/stats/report.html`);
}

// -----------------------------------------------------------------------------
function extractChunks(data) {
  if (data.tree?.children && data.nodeParts) {
    // v7+: cada child de root é um chunk.
    return data.tree.children
      .filter((c) => (c.name ?? '').endsWith('.js'))
      .map((chunkNode) => {
        const parts = [];
        collectLeaves(chunkNode, parts, data);
        return { name: chunkNode.name.replace(/^assets\//, ''), parts };
      });
  }
  throw new Error('Formato de report.json não reconhecido.');
}
function collectLeaves(node, out, data) {
  if (node.uid && data.nodeParts?.[node.uid]) {
    const part = data.nodeParts[node.uid];
    const meta = data.nodeMetas?.[part.metaUid] ?? {};
    out.push({
      id: meta.id ?? node.name,
      renderedLength: part.renderedLength ?? 0,
      gzipLength: part.gzipLength ?? 0,
      brotliLength: part.brotliLength ?? 0,
    });
  }
  if (node.children) for (const c of node.children) collectLeaves(c, out, data);
}
function depOf(id) {
  if (!id) return null;
  const m = id.match(/node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/);
  return m ? m[1].replace(/\\/g, '/') : null;
}
