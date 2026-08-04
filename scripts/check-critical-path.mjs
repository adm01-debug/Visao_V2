#!/usr/bin/env node
/**
 * Critical Path Guard — falha o build quando libs pesadas vazam para o
 * caminho crítico (chunks carregados eager a partir de `src/main.tsx`).
 *
 * Como funciona:
 *   1. Lê `dist/.vite/manifest.json` — gerado por `build.manifest: true` no
 *      `vite.config.ts`. O manifest lista, por módulo-fonte, o arquivo emitido
 *      e seus `imports` (eager) e `dynamicImports` (lazy).
 *   2. Faz BFS a partir do entry (`isEntry: true`, tipicamente `src/main.tsx`)
 *      seguindo APENAS `imports` — isso reconstrói o conjunto exato de chunks
 *      baixados no boot (o "caminho crítico").
 *   3. Escaneia esses chunks procurando strings-marker das libs pesadas
 *      proibidas. Faz sanitização para ignorar preload-manifests (arrays de
 *      strings tipo "assets/vendor-ml-….js" não contam como uso real).
 *   4. Sai com código != 0 se qualquer proibição bater — o CI falha o build.
 *
 * Regra: cada `HEAVY` abaixo é uma lib que DEVE ser lazy (`() => import(...)`).
 * Se cair no eager path, alguém trocou um `import dinâmico` por `import estático`
 * ou introduziu uma nova dep via cadeia de imports não-lazy.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const MANIFEST = join(DIST, '.vite', 'manifest.json');

// Libs proibidas no caminho crítico. `markers` são substrings estáveis
// (identificadores exportados, nomes de módulo internos) que aparecem no
// bundle transpiládo/minificado mesmo após tree-shaking + mangling de escopo.
const HEAVY = [
  {
    name: 'mapbox-gl',
    markers: ['mapboxgl', "'mapbox-gl'", '"mapbox-gl"', 'mapbox://'],
    expected: 'vendor-mapbox (lazy)',
  },
  {
    name: '@tensorflow/tfjs',
    markers: ['@tensorflow/tfjs', 'tfjsBackend', 'tf.engine', "'tfjs'"],
    expected: 'vendor-ml (lazy)',
  },
  {
    name: 'face-api.js',
    markers: ['face-api.js', 'faceapi.nets', 'SsdMobilenetv1', 'TinyFaceDetector'],
    expected: 'vendor-ml (lazy)',
  },
  {
    name: 'hls.js',
    markers: ['hls.js', 'HlsEvents', 'Hls.DefaultConfig'],
    expected: 'vendor-hls (lazy)',
  },
  {
    name: 'jspdf',
    markers: ['jspdf', 'jsPDF', 'html2canvas'],
    expected: 'vendor-pdf (lazy)',
  },
];

if (!existsSync(MANIFEST)) {
  console.error(
    `❌ ${MANIFEST} não encontrado. Habilite \`build.manifest: true\` no vite.config.ts e rode o build.`
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));

// Localiza o entry.
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('❌ Nenhum entry marcado como isEntry no manifest.');
  process.exit(1);
}

// BFS eager-only.
const eagerFiles = new Set();
const queue = [entryKey];
const visited = new Set();
while (queue.length) {
  const key = queue.shift();
  if (visited.has(key)) continue;
  visited.add(key);
  const node = manifest[key];
  if (!node) continue;
  if (node.file) eagerFiles.add(node.file);
  for (const css of node.css ?? []) eagerFiles.add(css);
  for (const imp of node.imports ?? []) queue.push(imp);
  // NÃO seguimos `dynamicImports` — é justamente esse o corte eager/lazy.
}

console.log(`\n🛡️  Critical Path Guard`);
console.log(`   Entry: ${entryKey}`);
console.log(`   Chunks eager: ${eagerFiles.size}`);

// Sanitização em 3 passos para evitar falso positivo:
//  1. Remove arrays de preload-manifests do Vite: __vitePreload(...,["assets/vendor-ml-….js", ...])
//  2. Remove strings literais dentro de `import("…")` / `import('…')` — ali o
//     nome do módulo é o argumento do dynamic import (que emite CHUNK LAZY),
//     não uso runtime da lib. Sem essa remoção, o guard flagga o próprio
//     dispatcher lazy do módulo consumidor (ex.: `pdfGenerator.ts` que
//     contém `import('jspdf')`) como se fosse leak eager.
//  3. Remove corpos de factories __cjs__/__esm__ do Rolldown (Vite 8+).
//     No Rolldown, módulos CJS/UMD são encapsulados em thunks usando helpers
//     importados de rolldown-runtime. O padrão é:
//       var x = t(((e,t)=>{ ... corpo da lib pesada ... }))
//     onde `t` é o helper __cjs__ (renomeado). O corpo da factory NÃO é
//     executado no carregamento do chunk — só quando o thunk é invocado
//     (i.e., quando o dynamic import resolve). Sem este passo, o guard
//     detecta falso positivo: markers como 'mapboxgl' ou 'html2canvas'
//     existem no arquivo do chunk mas dentro do factory body lazy.

/**
 * Strips Rolldown __cjs__/__esm__ factory bodies using brace-counting.
 * Pattern: singleCharFn(((params) => { ... factory body ... }))
 * e.g.: t(((e,t)=>{ ... mapbox-gl code ... }))
 *       n(((e,t)=>{ ... html2canvas code ... }))
 *       e((()=>{ ... preload helper ... }))
 * These bodies are NOT executed at module load time.
 */
function stripRolldownFactoryBodies(src) {
  // Match the opening of a Rolldown factory:
  //   single-char-fn + ( + one-or-more-( + arrow-fn-params + ) + => + {
  // Examples: t(((e,t)=>{ | n(((e,t)=>{ | e((()=>{
  const FACTORY_OPEN = /\b[\w$]\(\(+(?:[\w$]+(?:,[\w$]+)*)?\)\s*=>\s*\{/g;

  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = FACTORY_OPEN.exec(src)) !== null) {
    // Position of the opening `{` that starts the factory body
    const openBrace = match.index + match[0].length - 1;

    // Keep everything up to and including the opening `{`
    parts.push(src.slice(lastIdx, openBrace + 1));

    // Bracket-count to find the matching closing `}`
    let depth = 1;
    let i = openBrace + 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    // i now points past the closing `}` of the factory body

    parts.push('/* rolldown-factory-stripped */');
    lastIdx = i;
    FACTORY_OPEN.lastIndex = i;
  }

  parts.push(src.slice(lastIdx));
  return parts.join('');
}

function stripPreloadManifests(src) {
  return stripRolldownFactoryBodies(
    src
      .replace(/\[(?:"[^"]*\.(?:m?js|css)"(?:,\s*)?)+\]/g, '[]')
      .replace(/import\(\s*["'][^"']+["']\s*\)/g, 'import()')
  );
}

const violations = [];
for (const file of eagerFiles) {
  const path = join(DIST, file);
  if (!existsSync(path)) continue;
  if (!/\.(m?js)$/.test(file)) continue;
  const raw = readFileSync(path, 'utf-8');
  const sanitized = stripPreloadManifests(raw);
  for (const heavy of HEAVY) {
    const hits = heavy.markers.filter((m) => sanitized.includes(m));
    if (hits.length) {
      violations.push({ file, heavy: heavy.name, expected: heavy.expected, hits });
    }
  }
}

// Log tabular dos chunks eager (visibilidade sempre).
console.log(`\n   Arquivos no caminho crítico:`);
for (const f of [...eagerFiles].sort()) console.log(`     • ${f}`);

if (violations.length === 0) {
  console.log(`\n✅ Nenhuma lib pesada no caminho crítico.\n`);
  process.exit(0);
}

console.error(`\n❌ ${violations.length} violação(ões) detectada(s):\n`);
for (const v of violations) {
  console.error(`   • ${v.heavy} vazou para ${v.file}`);
  console.error(`     Marcadores: ${v.hits.join(', ')}`);
  console.error(`     Esperado em: ${v.expected}`);
  console.error(
    `     Ação: garanta que o import seja dinâmico (\`() => import(...)\`) e que o consumidor esteja em rota/página lazy.\n`
  );
}

// Extra: sugere qual chunk deveria ter absorvido (encontra por nome no dist).
const allChunks = existsSync(join(DIST, 'assets')) ? readdirSync(join(DIST, 'assets')) : [];
for (const v of violations) {
  const expectedPrefix = v.expected.split(' ')[0];
  const match = allChunks.find((c) => c.startsWith(expectedPrefix));
  if (match) console.error(`   ℹ️  Chunk lazy esperado existe: assets/${match}\n`);
}

process.exit(1);
