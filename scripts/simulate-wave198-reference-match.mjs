/**
 * Onda 198 — simulação massiva da comparação 1:N por imagem de referência.
 *
 * Cobre: recusas declaradas, incomparabilidade por modelo/dimensão,
 * monotonicidade do corte, determinismo da ordem, invariantes de ambiguidade,
 * limites matemáticos do cosseno e fuzzing.
 */

import {
  AMBIGUITY_MARGIN,
  DEFAULT_MATCH_THRESHOLD,
  MAX_MATCHES,
  REFERENCE_CANDIDATE_MARGIN,
  matchReference,
  safeCosine,
  embeddingNorm,
} from '../src/lib/faces/referenceMatch.ts';

let assertions = 0;
const failures = [];

function check(label, cond) {
  assertions += 1;
  if (!cond) failures.push(label);
}

const MODEL = 'arcface_r100_v1';

// PRNG determinístico (xorshift32).
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) % 1_000_000) / 1_000_000;
};

const randVec = (dim) => Array.from({ length: dim }, () => rnd() * 2 - 1);

const entry = (id, embedding, modelVersion = MODEL) => ({
  id,
  personId: `p-${id}`,
  personName: `Pessoa ${id}`,
  embedding,
  modelVersion,
  qualityScore: 0.9,
});

// ---------------------------------------------------------------- 1. cosseno
for (let i = 0; i < 5000; i++) {
  const dim = 3 + (i % 30);
  const a = randVec(dim);
  const b = randVec(dim);
  const cos = safeCosine(a, b);
  check('cosseno definido', cos === null || (cos >= -1 && cos <= 1));
  check('cosseno simétrico', cos === safeCosine(b, a));
  check('auto-cosseno = 1', Math.abs((safeCosine(a, a) ?? 0) - 1) < 1e-9);
  const scaled = a.map((v) => v * 7.3);
  check('cosseno invariante a escala', Math.abs((safeCosine(a, scaled) ?? 0) - 1) < 1e-9);
  check('dimensão diferente não mede', safeCosine(a, [...b, 1]) === null);
  check('norma zero não mede', embeddingNorm(new Array(dim).fill(0)) === null);
}

// ------------------------------------------------------------- 2. recusas
{
  const g = [entry('a', [1, 0, 0])];
  const q = { embedding: [1, 0, 0], modelVersion: MODEL };
  check('vetor ausente', matchReference({ ...q, embedding: [] }, g).reason === 'query_embedding_missing');
  check('vetor degenerado', matchReference({ ...q, embedding: [0, 0] }, g).reason === 'query_embedding_degenerate');
  check('galeria vazia', matchReference(q, []).reason === 'empty_gallery');
  for (const t of [-1, 0, 0.1, 0.299, 0.991, 1.5, Number.NaN]) {
    const r = matchReference(q, g, t);
    if (Number.isNaN(t)) check('NaN cai no padrão', r.ok === true);
    else check(`corte fora da faixa ${t}`, r.ok === false && r.reason === 'threshold_out_of_range');
  }
  for (const t of [0.3, 0.5, 0.7, 0.99]) {
    check(`corte válido ${t}`, matchReference(q, g, t).ok === true);
  }
}

// -------------------------------------------------- 3. incomparabilidade
for (let i = 0; i < 2000; i++) {
  const dim = 8;
  const q = { embedding: randVec(dim), modelVersion: MODEL };
  const g = [
    entry('m1', randVec(dim), 'face-api-128'),
    entry('m2', randVec(dim + 1), MODEL),
    entry('ok', q.embedding, MODEL),
  ];
  const r = matchReference(q, g);
  check('resposta ok', r.ok === true);
  const byId = Object.fromEntries(r.outcome.matches.map((m) => [m.id, m]));
  check('modelo diferente é incomparável', byId.m1.verdict === 'incomparable' && byId.m1.similarity === null);
  check('dimensão diferente é incomparável', byId.m2.verdict === 'incomparable' && byId.m2.similarity === null);
  check('idêntico é identificado', byId.ok.verdict === 'identified');
  check('contagem de incomparáveis', r.outcome.incomparableCount === 2 && r.outcome.comparedCount === 1);
  check('melhor é comparável', r.outcome.best !== null && r.outcome.best.similarity !== null);
}

// ---------------------------------------------- 4. fraude e vivacidade
for (let i = 0; i < 2000; i++) {
  const q = { embedding: randVec(6), modelVersion: MODEL, spoofDetected: true, livenessScore: 0.99 };
  const r = matchReference(q, [entry('a', q.embedding)]);
  check('fraude vence semelhança', r.ok && r.outcome.matches[0].verdict === 'spoof_suspect');
  check('fraude degrada', r.ok && r.outcome.degradedByQuery === true);

  const low = { embedding: q.embedding, modelVersion: MODEL, livenessScore: rnd() * 0.49 };
  const rl = matchReference(low, [entry('a', low.embedding)]);
  check('vivacidade baixa rebaixa', rl.ok && rl.outcome.matches[0].verdict === 'candidate');

  const high = { embedding: q.embedding, modelVersion: MODEL, livenessScore: 0.5 + rnd() * 0.5 };
  const rh = matchReference(high, [entry('a', high.embedding)]);
  check('vivacidade no piso não rebaixa', rh.ok && rh.outcome.matches[0].verdict === 'identified');
}

// ------------------------------------------------- 5. ambiguidade / ordem
for (let i = 0; i < 3000; i++) {
  const base = randVec(16);
  const near = base.map((v, idx) => v + (idx === 0 ? 1e-6 : 0));
  const q = { embedding: base, modelVersion: MODEL };
  const r = matchReference(q, [entry('b', near), entry('a', base)]);
  check('empate é ambíguo', r.ok && r.outcome.matches[0].verdict === 'ambiguous');
  check('desempate por id', r.ok && r.outcome.matches[0].id === 'a');
  check('segundo nunca é identificado', r.ok && r.outcome.matches[1].verdict !== 'identified');

  const far = base.map((v) => -v);
  const r2 = matchReference(q, [entry('a', base), entry('z', far)]);
  check('isolado identifica', r2.ok && r2.outcome.matches[0].verdict === 'identified');
  const top = r2.outcome.matches[0].similarity;
  const second = r2.outcome.matches[1].similarity;
  check('margem respeitada', top - second >= AMBIGUITY_MARGIN);
}

// --------------------------------------------- 6. monotonicidade do corte
for (let i = 0; i < 3000; i++) {
  const dim = 12;
  const q = { embedding: randVec(dim), modelVersion: MODEL };
  const gallery = Array.from({ length: 6 }, (_, k) => entry(`g${k}`, randVec(dim)));
  let previousIdentified = Infinity;
  for (const t of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.99]) {
    const r = matchReference(q, gallery, t);
    check('ok', r.ok === true);
    check('corte ecoado', r.outcome.threshold === t);
    const identified = r.outcome.matches.filter((m) => m.verdict === 'identified').length;
    check('no máximo um identificado', identified <= 1);
    check('monotônico no corte', identified <= previousIdentified);
    previousIdentified = identified;

    for (const m of r.outcome.matches) {
      if (m.similarity === null) {
        check('sem medida = incomparável', m.verdict === 'incomparable');
        continue;
      }
      check('distância coerente', Math.abs(m.distance - (1 - m.similarity)) < 1e-12);
      const floor = Math.max(0, t - REFERENCE_CANDIDATE_MARGIN);
      if (m.similarity < floor) check('abaixo do piso não identifica', m.verdict === 'unidentified');
      if (m.verdict === 'identified') check('identificado está acima do corte', m.similarity >= t);
      if (m.verdict === 'candidate') check('candidato está acima do piso', m.similarity >= floor);
    }
    // ordem determinística e estável
    const rerun = matchReference(q, gallery, t);
    check(
      'determinismo',
      JSON.stringify(rerun.outcome.matches) === JSON.stringify(r.outcome.matches),
    );
    for (let k = 1; k < r.outcome.matches.length; k++) {
      const prev = r.outcome.matches[k - 1];
      const cur = r.outcome.matches[k];
      if (prev.similarity !== null && cur.similarity !== null) {
        check('ordem desc', prev.similarity >= cur.similarity);
      }
      if (prev.similarity === null) check('incomparáveis ao fim', cur.similarity === null);
    }
  }
}

// ------------------------------------------------------- 7. teto e fuzzing
for (let i = 0; i < 300; i++) {
  const dim = 4;
  const q = { embedding: randVec(dim), modelVersion: MODEL };
  const gallery = Array.from({ length: 120 }, (_, k) => entry(`g${String(k).padStart(3, '0')}`, randVec(dim)));
  const r = matchReference(q, gallery, DEFAULT_MATCH_THRESHOLD);
  check('teto de resultados', r.outcome.matches.length <= MAX_MATCHES);
  check('comparados contam a galeria inteira', r.outcome.comparedCount === 120);
}

for (let i = 0; i < 20000; i++) {
  const dim = 1 + Math.floor(rnd() * 10);
  const q = {
    embedding: rnd() < 0.05 ? [] : randVec(dim),
    modelVersion: rnd() < 0.5 ? MODEL : 'face-api-128',
    livenessScore: rnd() < 0.3 ? null : rnd(),
    spoofDetected: rnd() < 0.1,
  };
  const gallery = Array.from({ length: 1 + Math.floor(rnd() * 5) }, (_, k) =>
    entry(`f${k}`, rnd() < 0.05 ? new Array(dim).fill(0) : randVec(dim), rnd() < 0.5 ? MODEL : 'face-api-128'),
  );
  const r = matchReference(q, gallery, 0.3 + rnd() * 0.6);
  check('nunca lança', r !== undefined);
  if (r.ok) {
    for (const m of r.outcome.matches) {
      check('similaridade em faixa', m.similarity === null || (m.similarity >= -1 && m.similarity <= 1));
      check('racional presente', typeof m.rationale === 'string' && m.rationale.length > 0);
      if (q.spoofDetected && m.similarity !== null) {
        check('fraude propaga', m.verdict === 'spoof_suspect');
      }
    }
  }
}

console.log(`Onda 198 — asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of [...new Set(failures)].slice(0, 20)) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Onda 198 — todos os invariantes mantidos.');
