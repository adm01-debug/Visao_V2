#!/usr/bin/env node
/**
 * Onda 161 — simulação adversarial do E-Map (planta baixa).
 *
 * O que estamos tentando quebrar, e por quê:
 *   I1. Um marcador não pode escorregar ao redimensionar a janela.
 *       (ida-e-volta normalizado → pixel → normalizado deve ser estável)
 *   I2. Nenhum marcador pode sumir do mapa por causa do agrupamento.
 *   I3. Um agrupamento nunca pode parecer mais calmo que seu pior membro.
 *   I4. Nenhum marcador pode cair sobre a tarja (fora da imagem da planta).
 *   I5. Dado sujo (NaN, null, ângulo negativo) nunca vira `NaN%` no CSS.
 *   I6. A ordem de entrada não pode mudar o desenho do mapa.
 *   I7. O cone de visão precisa atravessar os 360° corretamente.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jiti = require('jiti')(import.meta.url, { interopDefault: true, esmResolve: true });

const {
  clampToPlan,
  normalizeAngle,
  normalizeFov,
  fitImage,
  toContainerPixels,
  toNormalizedPoint,
  bearingWithinFov,
  worstStatus,
  clusterMarkers,
  summarizePlan,
} = jiti('../src/lib/emap/floorPlanGeometry.ts');

let assertions = 0;
let failures = 0;
const assert = (cond, msg) => {
  assertions += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
};

// PRNG determinístico: uma falha achada aqui tem que ser reproduzível.
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 0xffffffff;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

const STATUSES = ['alert', 'offline', 'warning', 'online', 'unknown'];
const SEVERITY = { alert: 0, offline: 1, warning: 2, unknown: 3, online: 4 };

console.log('Onda 161 — simulação do E-Map (planta baixa)\n');

// ---------------------------------------------------------------- I5 + ângulos
{
  const dirty = [
    [{ x: Number.NaN, y: 0.5 }, 'NaN'],
    [{ x: 0.5, y: Number.POSITIVE_INFINITY }, 'Infinity'],
    [{}, 'objeto vazio'],
    [null, 'null'],
    [undefined, 'undefined'],
    [{ x: -3, y: 12 }, 'fora dos limites'],
    [{ x: '0.4', y: '0.4' }, 'strings'],
  ];
  for (const [input, label] of dirty) {
    const r = clampToPlan(input);
    assert(
      Number.isFinite(r.point.x) && Number.isFinite(r.point.y),
      `I5: ${label} devia virar número finito`
    );
    assert(
      r.point.x >= 0 && r.point.x <= 1 && r.point.y >= 0 && r.point.y <= 1,
      `I5: ${label} devia ficar dentro da planta`
    );
    assert(r.clamped === true, `I5: ${label} devia ser sinalizado como corrigido`);
  }
  const clean = clampToPlan({ x: 0.25, y: 0.75 });
  assert(clean.clamped === false, 'I5: ponto válido não pode ser marcado como corrigido');

  for (let i = 0; i < 400; i += 1) {
    const deg = (rnd() - 0.5) * 4000;
    const n = normalizeAngle(deg);
    assert(n >= 0 && n < 360, `I5: ângulo normalizado fora de [0,360): ${n}`);
    assert(
      Math.abs((n - deg) % 360) < 1e-6 || Math.abs(Math.abs((n - deg) % 360) - 360) < 1e-6,
      'I5: normalização de ângulo mudou a direção'
    );
  }
  assert(normalizeAngle(-90) === 270, 'I5: -90° devia virar 270°');
  assert(normalizeAngle(360) === 0, 'I5: 360° devia virar 0°');
  assert(normalizeAngle(Number.NaN) === 0, 'I5: NaN de ângulo devia virar 0');
  assert(normalizeFov(-10) === 0 && normalizeFov(0) === 0, 'I5: FOV inválido não desenha cone');
  assert(normalizeFov(900) === 360, 'I5: FOV é limitado a 360°');
}

// ------------------------------------------------------------------------- I7
{
  // Cone de 40° apontando para 350°: cobre 330°→10°.
  assert(bearingWithinFov(5, 350, 40), 'I7: 5° devia estar no cone 350°±20°');
  assert(bearingWithinFov(355, 350, 40), 'I7: 355° devia estar no cone');
  assert(bearingWithinFov(331, 350, 40), 'I7: 331° devia estar no cone');
  assert(!bearingWithinFov(29, 350, 40), 'I7: 29° NÃO devia estar no cone');
  assert(!bearingWithinFov(180, 350, 40), 'I7: 180° NÃO devia estar no cone');
  assert(bearingWithinFov(123, 0, 360), 'I7: cone de 360° cobre tudo');
  assert(!bearingWithinFov(0, 0, 0), 'I7: FOV zero não cobre nada');

  for (let i = 0; i < 600; i += 1) {
    const heading = rnd() * 360;
    const fov = 1 + rnd() * 200;
    // Um rumo construído dentro do cone tem que ser aceito, mesmo com virada.
    const inside = heading + (rnd() - 0.5) * (fov - 1e-3);
    assert(
      bearingWithinFov(inside, heading, fov),
      `I7: rumo interno rejeitado (h=${heading} fov=${fov})`
    );
    const outside = heading + 180;
    if (fov < 359) {
      assert(
        !bearingWithinFov(outside, heading, fov),
        `I7: rumo oposto aceito (h=${heading} fov=${fov})`
      );
    }
    // Simetria: girar tudo em +N graus não muda o resultado.
    const shift = rnd() * 720 - 360;
    assert(
      bearingWithinFov(inside + shift, heading + shift, fov) === true,
      'I7: cone não é invariante a rotação global'
    );
  }
}

// -------------------------------------------------------------- I1 + I4 (fit)
{
  const containers = [
    [1280, 720],
    [390, 844],
    [1920, 1080],
    [800, 800],
    [2560, 1080],
    [320, 900],
  ];
  const images = [
    [1000, 1000],
    [4000, 3000],
    [1024, 4096],
    [1600, 900],
    [3, 7],
    [7680, 4320],
  ];

  for (const [cw, ch] of containers) {
    for (const [iw, ih] of images) {
      const rect = fitImage(iw, ih, cw, ch);
      assert(
        rect.width <= cw + 1e-6 && rect.height <= ch + 1e-6,
        'I4: imagem encaixada extrapola o contêiner'
      );
      assert(
        Math.abs(rect.width / rect.height - iw / ih) < 1e-6,
        'I4: encaixe distorceu a proporção da planta'
      );
      assert(rect.left >= -1e-6 && rect.top >= -1e-6, 'I4: imagem encaixada saiu pela borda');

      for (let i = 0; i < 40; i += 1) {
        const p = { x: rnd(), y: rnd() };
        const px = toContainerPixels(p, rect);
        // I4 — o pixel do marcador cai DENTRO da imagem, nunca na tarja.
        assert(
          px.x >= rect.left - 1e-6 &&
            px.x <= rect.left + rect.width + 1e-6 &&
            px.y >= rect.top - 1e-6 &&
            px.y <= rect.top + rect.height + 1e-6,
          'I4: marcador caiu fora da planta (na tarja)'
        );
        // I1 — ida e volta é estável.
        const back = toNormalizedPoint(px, rect);
        assert(
          Math.abs(back.point.x - p.x) < 1e-9 && Math.abs(back.point.y - p.y) < 1e-9,
          `I1: ida-e-volta moveu o marcador (${p.x},${p.y})`
        );
      }

      // I1 — a MESMA coordenada normalizada em dois contêineres diferentes
      // aponta para a mesma fração da planta: redimensionar não move nada.
      const rectB = fitImage(iw, ih, cw * 0.5, ch * 0.5);
      const p = { x: 0.33, y: 0.66 };
      const fracA = (() => {
        const px = toContainerPixels(p, rect);
        return { x: (px.x - rect.left) / rect.width, y: (px.y - rect.top) / rect.height };
      })();
      const fracB = (() => {
        const px = toContainerPixels(p, rectB);
        return { x: (px.x - rectB.left) / rectB.width, y: (px.y - rectB.top) / rectB.height };
      })();
      assert(
        Math.abs(fracA.x - fracB.x) < 1e-9 && Math.abs(fracA.y - fracB.y) < 1e-9,
        'I1: redimensionar o contêiner moveu o marcador na planta'
      );
    }
  }

  // Contêiner degenerado (ex.: painel ainda com 0px durante a montagem).
  for (const bad of [
    [0, 0],
    [-1, 10],
    [Number.NaN, 100],
  ]) {
    const rect = fitImage(1000, 1000, bad[0], bad[1]);
    assert(
      rect.width === 0 && rect.scale === 0,
      'I5: contêiner inválido devia produzir retângulo nulo'
    );
    const back = toNormalizedPoint({ x: 10, y: 10 }, rect);
    assert(Number.isFinite(back.point.x), 'I5: contêiner nulo não pode gerar NaN');
  }
}

// -------------------------------------------------------------------- I3 pior
{
  for (const s of STATUSES) {
    assert(worstStatus([s]) === s, `I3: estado único devia ser preservado (${s})`);
  }
  assert(worstStatus([]) === 'unknown', 'I3: conjunto vazio é desconhecido, não "online"');
  assert(
    worstStatus(['online', 'unknown']) === 'unknown',
    'I3: desconhecido nunca vira "tudo certo"'
  );
  assert(
    worstStatus(['warning', 'unknown']) === 'warning',
    'I3: aviso é mais grave que desconhecido'
  );

  for (let i = 0; i < 1200; i += 1) {
    const n = 1 + Math.floor(rnd() * 8);
    const set = Array.from({ length: n }, () => pick(STATUSES));
    const got = worstStatus(set);
    const expected = set.reduce((a, b) => (SEVERITY[b] < SEVERITY[a] ? b : a));
    assert(got === expected, `I3: pior estado errado em [${set.join(',')}] → ${got}`);
    // Comutatividade: embaralhar não pode mudar o veredito.
    const shuffled = [...set].sort(() => rnd() - 0.5);
    assert(worstStatus(shuffled) === got, 'I3: pior estado depende da ordem');
    if (set.includes('alert')) {
      assert(got === 'alert', 'I3: um alarme foi escondido pelo agrupamento');
    }
  }
}

// ----------------------------------------------------- I2 + I3 + I6 (cluster)
{
  const rect = fitImage(2000, 1000, 1280, 720);

  for (let scenario = 0; scenario < 300; scenario += 1) {
    const n = Math.floor(rnd() * 40);
    const placements = Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      cameraId: `cam-${i}`,
      label: `Câmera ${i}`,
      position: { x: rnd(), y: rnd() },
      headingDeg: rnd() * 360,
      fovDeg: rnd() * 120,
      status: pick(STATUSES),
    }));
    const sep = pick([0, 8, 24, 60, 200]);

    const clusters = clusterMarkers(placements, { minSeparationPx: sep, rect });

    // I2 — ninguém some, ninguém duplica.
    const ids = clusters.flatMap((c) => c.members.map((m) => m.id)).sort();
    assert(ids.length === n, `I2: ${n - ids.length} marcador(es) sumiram do mapa`);
    assert(new Set(ids).size === n, 'I2: marcador apareceu em mais de um agrupamento');

    // I3 — estado do agrupamento é o do pior membro.
    for (const c of clusters) {
      const expected = c.members.reduce(
        (a, m) => (SEVERITY[m.status] < SEVERITY[a] ? m.status : a),
        'online'
      );
      assert(c.status === expected, `I3: agrupamento mostrou "${c.status}" contendo "${expected}"`);
      assert(c.worstCount >= 1, 'I3: contagem do pior estado devia ser ao menos 1');
      assert(
        c.center.x >= 0 && c.center.x <= 1 && c.center.y >= 0 && c.center.y <= 1,
        'I4: centro do agrupamento saiu da planta'
      );
    }

    // I6 — a ordem de entrada não muda o desenho.
    const shuffled = [...placements].sort(() => rnd() - 0.5);
    const again = clusterMarkers(shuffled, { minSeparationPx: sep, rect });
    const fingerprint = (list) =>
      list
        .map((c) => c.key)
        .sort()
        .join('#');
    assert(
      fingerprint(clusters) === fingerprint(again),
      'I6: agrupamento depende da ordem de entrada'
    );

    // Separação zero desliga o agrupamento.
    if (sep === 0) {
      assert(clusters.length === n, 'I2: com separação 0 cada câmera é um marcador');
    }

    // Resumo bate com os membros.
    const summary = summarizePlan(placements);
    assert(summary.total === n, 'I2: resumo perdeu marcadores');
    const counted = Object.values(summary.byStatus).reduce((a, b) => a + b, 0);
    assert(counted === n, 'I2: soma do resumo por estado não fecha');
    if (n > 0) {
      assert(
        summary.worst === worstStatus(placements.map((p) => p.status)),
        'I3: resumo suavizou o pior estado'
      );
    }
  }

  // Caso dirigido: duas câmeras coladas, uma em alarme — o alarme tem que
  // aparecer no agrupamento mesmo sendo a segunda a entrar.
  const glued = clusterMarkers(
    [
      {
        id: 'a',
        cameraId: 'a',
        label: 'A',
        position: { x: 0.5, y: 0.5 },
        headingDeg: 0,
        fovDeg: 90,
        status: 'online',
      },
      {
        id: 'b',
        cameraId: 'b',
        label: 'B',
        position: { x: 0.5005, y: 0.5 },
        headingDeg: 0,
        fovDeg: 90,
        status: 'alert',
      },
    ],
    { minSeparationPx: 40, rect }
  );
  assert(glued.length === 1, 'I2: câmeras coladas deviam formar um agrupamento');
  assert(glued[0].status === 'alert', 'I3: alarme escondido atrás de marcador verde');
  assert(glued[0].worstCount === 1, 'I3: contagem do pior estado errada');

  // Marcadores com posição suja continuam no mapa e são contados como corrigidos.
  const dirtySummary = summarizePlan([
    {
      id: 'x',
      cameraId: 'x',
      label: 'X',
      position: { x: 5, y: -2 },
      headingDeg: 0,
      fovDeg: 0,
      status: 'online',
    },
    {
      id: 'y',
      cameraId: 'y',
      label: 'Y',
      position: { x: Number.NaN, y: 0.2 },
      headingDeg: 0,
      fovDeg: 0,
      status: 'offline',
    },
    {
      id: 'z',
      cameraId: 'z',
      label: 'Z',
      position: { x: 0.2, y: 0.2 },
      headingDeg: 0,
      fovDeg: 0,
      status: 'online',
    },
  ]);
  assert(dirtySummary.outOfBounds === 2, 'I5: marcadores fora da planta não foram contados');
  assert(dirtySummary.total === 3, 'I2: marcador sujo sumiu do resumo');
}

console.log(`\n${assertions} asserções, ${failures} falha(s).`);
if (failures > 0) {
  console.error('✗ Onda 161 — E-Map reprovado.');
  process.exit(1);
}
console.log('✓ Onda 161 — geometria do E-Map aprovada.');
