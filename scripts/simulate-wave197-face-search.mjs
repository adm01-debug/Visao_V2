/**
 * Onda 197 — simulação preventiva da Busca de Faces.
 *
 * Exercita a régua única contra as armadilhas que já custaram caro em ondas
 * anteriores: promover suspeita a prova, tratar "não medido" como "não é",
 * janela silenciosamente corrigida, ordem instável e filtro de atributo que
 * finge ter varrido o acervo inteiro.
 */
import {
  CANDIDATE_MARGIN,
  LIVENESS_FLOOR,
  MAX_WINDOW_DAYS,
  classifyFaceObservation,
  matchesFaceCriteria,
  normalizeFaceSearchCriteria,
  runFaceSearch,
  summarizeFaceSearch,
} from '../src/lib/faces/faceSearch.ts';

let assertions = 0;
const failures = [];

const check = (name, cond) => {
  assertions += 1;
  if (!cond) failures.push(name);
};

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const baseCriteria = (over = {}) => ({
  fromMs: NOW - DAY,
  toMs: NOW,
  cameraIds: null,
  personIds: null,
  minSimilarity: 0.7,
  attributes: { gender: null, ageMin: null, ageMax: null },
  includeSpoof: false,
  ...over,
});

const obs = (over = {}) => ({
  id: 'x',
  timestampMs: NOW - HOUR,
  cameraId: 'cam-1',
  personId: 'p-1',
  similarity: 0.9,
  recognized: true,
  spoofDetected: false,
  livenessScore: 0.9,
  ageEstimated: 30,
  genderEstimated: 'male',
  imageUrl: null,
  ...over,
});

// ---------------------------------------------------------------- 1. Janela
for (let d = 1; d <= 60; d += 1) {
  const r = normalizeFaceSearchCriteria({ fromMs: NOW - d * DAY, toMs: NOW }, NOW);
  const shouldPass = d <= MAX_WINDOW_DAYS;
  check(`janela ${d}d`, r.ok === shouldPass);
  if (!r.ok) check(`janela ${d}d motivo`, r.reason === 'window_too_long');
}

for (let i = 0; i < 2000; i += 1) {
  const from = NOW - Math.floor(Math.random() * 60 * DAY);
  const to = from + Math.floor(Math.random() * 40 * DAY);
  const r = normalizeFaceSearchCriteria({ fromMs: from, toMs: to }, NOW);
  if (r.ok) {
    check('janela nunca no futuro', r.criteria.toMs <= NOW);
    check('janela nunca invertida', r.criteria.toMs > r.criteria.fromMs);
    check('janela dentro do teto', r.criteria.toMs - r.criteria.fromMs <= MAX_WINDOW_DAYS * DAY);
  } else {
    check('recusa declarada', typeof r.reason === 'string' && r.reason.length > 0);
  }
}

// -------------------------------------------------- 2. Semelhança e veredito
for (let cut = 30; cut <= 99; cut += 1) {
  const c = baseCriteria({ minSimilarity: cut / 100 });
  for (let s = 0; s <= 100; s += 1) {
    const v = classifyFaceObservation(obs({ similarity: s / 100 }), c).verdict;
    const floor = Math.max(0, c.minSimilarity - CANDIDATE_MARGIN);
    if (s / 100 >= c.minSimilarity) check('acima do corte identifica', v === 'identified');
    else if (s / 100 >= floor) check('folga é candidato', v === 'candidate');
    else check('abaixo do piso não identifica', v === 'unidentified');
    check('nunca identifica abaixo do corte', !(v === 'identified' && s / 100 < c.minSimilarity));
  }
}

// --------------------------------------------------- 3. Fraude e vivacidade
for (let s = 0; s <= 100; s += 1) {
  const c = baseCriteria();
  check(
    'fraude nunca identifica',
    classifyFaceObservation(obs({ spoofDetected: true, similarity: s / 100 }), c).verdict ===
      'spoof_suspect'
  );
  for (let l = 0; l <= 100; l += 5) {
    const v = classifyFaceObservation(
      obs({ similarity: s / 100, livenessScore: l / 100 }),
      c
    ).verdict;
    if (l / 100 < LIVENESS_FLOOR) check('vivacidade baixa nunca identifica', v !== 'identified');
    check('vivacidade nunca promove', !(v === 'identified' && l / 100 < LIVENESS_FLOOR));
  }
}

// ------------------------------------------- 4. "Não medido" nunca é "não é"
for (let i = 0; i < 500; i += 1) {
  const c = baseCriteria({ minSimilarity: 0.3 + Math.random() * 0.6 });
  const v = classifyFaceObservation(obs({ similarity: null }), c).verdict;
  check('sem medição é indeterminado', v === 'unverified');
  const nan = classifyFaceObservation(obs({ similarity: Number.NaN }), c).verdict;
  check('NaN é indeterminado', nan === 'unverified');
}

// ------------------------------------------------- 5. Recorte: bordas e filtro
for (let i = 0; i < 3000; i += 1) {
  const c = baseCriteria();
  const t = c.fromMs + Math.floor(Math.random() * (DAY + 2 * HOUR)) - HOUR;
  const inside = matchesFaceCriteria(obs({ timestampMs: t }), c);
  check('borda coerente', inside === (t >= c.fromMs && t < c.toMs));
}
check('início inclusivo', matchesFaceCriteria(obs({ timestampMs: NOW - DAY }), baseCriteria()));
check('fim exclusivo', !matchesFaceCriteria(obs({ timestampMs: NOW }), baseCriteria()));

const genderFilter = baseCriteria({ attributes: { gender: 'female', ageMin: null, ageMax: null } });
check(
  'atributo ausente é excluído',
  !matchesFaceCriteria(obs({ genderEstimated: null }), genderFilter)
);
check(
  'atributo diferente é excluído',
  !matchesFaceCriteria(obs({ genderEstimated: 'male' }), genderFilter)
);
check(
  'atributo igual entra',
  matchesFaceCriteria(obs({ genderEstimated: 'FEMALE' }), genderFilter)
);

for (let min = 0; min <= 90; min += 5) {
  for (let max = min; max <= 100; max += 5) {
    const c = baseCriteria({ attributes: { gender: null, ageMin: min, ageMax: max } });
    for (let age = 0; age <= 100; age += 10) {
      check(
        `faixa ${min}-${max} idade ${age}`,
        matchesFaceCriteria(obs({ ageEstimated: age }), c) === (age >= min && age <= max)
      );
    }
    check('idade ausente excluída', !matchesFaceCriteria(obs({ ageEstimated: null }), c));
  }
}

// ------------------------------------------------ 6. Ordem e determinismo
for (let i = 0; i < 400; i += 1) {
  const c = baseCriteria({ includeSpoof: true, minSimilarity: 0.6 });
  const items = [];
  for (let k = 0; k < 40; k += 1) {
    items.push(
      obs({
        id: `id-${Math.floor(Math.random() * 1000)}-${k}`,
        timestampMs: c.fromMs + Math.floor(Math.random() * 12) * HOUR,
        similarity: Math.random() < 0.2 ? null : Math.random(),
        spoofDetected: Math.random() < 0.1,
        personId: Math.random() < 0.3 ? null : 'p-1',
        livenessScore: Math.random() < 0.2 ? Math.random() * 0.5 : 0.9,
      })
    );
  }
  const a = runFaceSearch(items, c);
  const b = runFaceSearch([...items].reverse(), c);
  check('determinismo', JSON.stringify(a.map((r) => r.id)) === JSON.stringify(b.map((r) => r.id)));
  for (let k = 1; k < a.length; k += 1) {
    const prev = a[k - 1];
    const cur = a[k];
    check(
      'ordem estável',
      prev.timestampMs > cur.timestampMs ||
        (prev.timestampMs === cur.timestampMs && prev.id <= cur.id)
    );
  }
  const s = summarizeFaceSearch(a);
  check(
    'resumo fecha',
    s.identified + s.candidate + s.unidentified + s.spoofSuspect + s.unverified === s.total
  );
  check('proporção medida em faixa', s.measuredRatio >= 0 && s.measuredRatio <= 1);
  check(
    'sem fraude quando excluída',
    runFaceSearch(items, baseCriteria()).every((r) => r.verdict !== 'spoof_suspect')
  );
}

// ------------------------------------------------------------ 7. Fuzz geral
for (let i = 0; i < 30000; i += 1) {
  const raw = {
    fromMs: Math.random() < 0.1 ? null : NOW - Math.floor(Math.random() * 90 * DAY),
    toMs: Math.random() < 0.1 ? null : NOW - Math.floor(Math.random() * 40 * DAY) + DAY,
    minSimilarity: Math.random() < 0.15 ? Math.random() * 2 - 0.5 : 0.3 + Math.random() * 0.65,
    attributes: {
      gender: Math.random() < 0.3 ? 'male' : null,
      ageMin: Math.random() < 0.3 ? Math.floor(Math.random() * 80) : null,
      ageMax: Math.random() < 0.3 ? Math.floor(Math.random() * 80) : null,
    },
    includeSpoof: Math.random() < 0.5,
  };
  const r = normalizeFaceSearchCriteria(raw, NOW);
  check('normalização total', r.ok === true || typeof r.reason === 'string');
  if (r.ok) {
    const v = classifyFaceObservation(
      obs({
        similarity: Math.random() < 0.2 ? null : Math.random(),
        spoofDetected: Math.random() < 0.2,
        personId: Math.random() < 0.5 ? null : 'p-1',
      }),
      r.criteria
    );
    check(
      'veredito conhecido',
      ['identified', 'candidate', 'unidentified', 'spoof_suspect', 'unverified'].includes(v.verdict)
    );
    check('sempre há motivo', typeof v.rationale === 'string' && v.rationale.length > 10);
  }
}

console.log(`Onda 197 — Busca de Faces`);
console.log(`Asserções: ${assertions.toLocaleString('pt-BR')}`);
console.log(`Falhas: ${failures.length}`);
if (failures.length > 0) {
  console.error([...new Set(failures)].slice(0, 20));
  process.exit(1);
}
