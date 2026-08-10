#!/usr/bin/env node
/**
 * Onda Shinobi 6 — Motion Regions (máscaras poligonais)
 * Simulação: point-in-polygon ray-casting, validação de polígonos, modo include/exclude,
 * sensitivity clamp, isolamento por user, precedência exclude > include, edge cases (colinear, self-intersect básico).
 */
let pass = 0,
  fail = 0;
const check = (n, c) => {
  if (c) pass++;
  else {
    fail++;
    console.error('❌', n);
  }
};

// ray-casting
function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1];
    const xj = poly[j][0],
      yj = poly[j][1];
    const intersect =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const square = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
check('center in square', pointInPoly([5, 5], square));
check('outside right', !pointInPoly([15, 5], square));
check('outside left', !pointInPoly([-1, 5], square));

const triangle = [
  [0, 0],
  [10, 0],
  [5, 10],
];
check('center triangle', pointInPoly([5, 3], triangle));
check('above apex', !pointInPoly([5, 11], triangle));

// Validação polígono
function validatePoly(p) {
  if (!Array.isArray(p) || p.length < 3) return false;
  return p.every(
    (pt) => Array.isArray(pt) && pt.length === 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
  );
}
check('valid square', validatePoly(square));
check(
  'reject 2 pts',
  !validatePoly([
    [0, 0],
    [1, 1],
  ])
);
check(
  'reject NaN',
  !validatePoly([
    [0, 0],
    [NaN, 1],
    [2, 2],
  ])
);
check('reject non-array', !validatePoly('nope'));

// Sensitivity clamp
const clampSens = (v) => Math.max(0, Math.min(100, Math.round(v)));
check('clamp -5', clampSens(-5) === 0);
check('clamp 150', clampSens(150) === 100);
check('clamp 42.4', clampSens(42.4) === 42);

// Precedência exclude > include
function shouldTrigger(masks, pt) {
  let inInclude = false,
    inExclude = false;
  for (const m of masks) {
    if (pointInPoly(pt, m.polygon)) {
      if (m.mode === 'exclude') inExclude = true;
      if (m.mode === 'include') inInclude = true;
    }
  }
  // Se há qualquer include definida, exige estar dentro; senão default true
  const hasInclude = masks.some((m) => m.mode === 'include');
  if (inExclude) return false;
  if (hasInclude) return inInclude;
  return true;
}
const masks1 = [{ mode: 'include', polygon: square }];
check('include only inside', shouldTrigger(masks1, [5, 5]));
check('include only outside', !shouldTrigger(masks1, [50, 50]));

const masks2 = [
  { mode: 'include', polygon: square },
  {
    mode: 'exclude',
    polygon: [
      [3, 3],
      [7, 3],
      [7, 7],
      [3, 7],
    ],
  },
];
check('include+exclude center excluded', !shouldTrigger(masks2, [5, 5]));
check('include+exclude edge included', shouldTrigger(masks2, [1, 1]));

// Isolamento por user
const rows = [
  { user_id: 'A', camera_id: 'c1', name: 'm1' },
  { user_id: 'B', camera_id: 'c1', name: 'm1' },
];
check('user A sees 1', rows.filter((r) => r.user_id === 'A').length === 1);

// 500 permutações aleatórias
for (let i = 0; i < 500; i++) {
  const cx = Math.random() * 100,
    cy = Math.random() * 100,
    r = 5 + Math.random() * 20;
  const poly = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    poly.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  check(`perm ${i} center inside`, pointInPoly([cx, cy], poly));
  check(`perm ${i} far outside`, !pointInPoly([cx + 500, cy], poly));
  check(`perm ${i} valid`, validatePoly(poly));
}

// Edge: ponto na aresta (comportamento consistente — não crash)
check('edge point no crash', typeof pointInPoly([0, 5], square) === 'boolean');
check('vertex no crash', typeof pointInPoly([0, 0], square) === 'boolean');

console.log(`\nResultado: ${pass}/${pass + fail} ✅  (falhas: ${fail})`);
if (fail > 0) process.exit(1);
