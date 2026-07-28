#!/usr/bin/env node
/**
 * Onda 188 — Simulação exaustiva da restauração de visualizações favoritas.
 *
 * Percorre o produto cartesiano de layouts × arranjos salvos (incluindo buracos,
 * duplicatas, posições inválidas e câmeras apagadas) × estado da frota, e valida
 * as invariantes I1..I9 de `src/lib/views/favoriteViewRestore.ts`.
 *
 * Uso: `node scripts/simulate-wave188-favorite-views.mjs`
 */
import {
  LAYOUT_SLOTS,
  MONITOR_LAYOUTS,
  MAX_SLOT_INDEX,
  restoreFavoriteView,
  describeRestore,
  cellsToSavedSlots,
  normalizeFavoriteName,
} from '../src/lib/views/favoriteViewRestore.ts';

let assertions = 0;
const failures = [];

function check(condition, label, ctx) {
  assertions += 1;
  if (!condition) {
    failures.push(`${label} :: ${JSON.stringify(ctx)}`);
    if (failures.length > 20) {
      console.error(failures.join('\n'));
      throw new Error('Muitas falhas — abortando simulação.');
    }
  }
}

const CAMS = Array.from({ length: 40 }, (_, i) => `cam-${String(i).padStart(2, '0')}`);

/** PRNG determinístico (mulberry32) — simulação precisa ser reproduzível. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSaved(rand, mode) {
  const rows = [];
  const count = 1 + Math.floor(rand() * 14);
  for (let i = 0; i < count; i += 1) {
    let slot = Math.floor(rand() * (MAX_SLOT_INDEX + 1));
    let cam = CAMS[Math.floor(rand() * CAMS.length)];
    if (mode === 'dup_slot' && rows.length > 0 && rand() < 0.5) slot = rows[0].slot_index;
    if (mode === 'dup_cam' && rows.length > 0 && rand() < 0.5) cam = rows[0].camera_id;
    if (mode === 'invalid' && rand() < 0.3) slot = [-1, 1.5, 99, NaN][Math.floor(rand() * 4)];
    if (mode === 'invalid' && rand() < 0.2) cam = ['', '   '][Math.floor(rand() * 2)];
    rows.push({ slot_index: slot, camera_id: cam });
  }
  return rows;
}

const MODES = ['plain', 'dup_slot', 'dup_cam', 'invalid'];
const VISIBILITY = [1, 0.7, 0.3, 0];

for (let seed = 1; seed <= 4000; seed += 1) {
  const rand = rng(seed);
  for (const layout of MONITOR_LAYOUTS) {
    const capacity = LAYOUT_SLOTS[layout];
    for (const mode of MODES) {
      const saved = buildSaved(rand, mode);
      for (const share of VISIBILITY) {
        const visible = new Set(CAMS.filter(() => rand() < share));
        const ctx = { seed, layout, mode, share };
        const savedSnapshot = JSON.stringify(saved);
        const r = restoreFavoriteView({ layout, saved, visibleCameraIds: visible });

        // I1 — a grade sempre tem exatamente a capacidade do layout, em ordem.
        check(r.cells.length === capacity, 'I1 capacidade', ctx);
        check(r.cells.every((c, i) => c.slotIndex === i), 'I1 ordem posicional', ctx);

        // I2 — célula preenchida sempre aponta para câmera visível e sem motivo de vacância.
        for (const c of r.cells) {
          if (c.cameraId) {
            check(visible.has(c.cameraId), 'I2 célula com câmera invisível', { ...ctx, c });
            check(c.vacancy === null, 'I2 preenchida sem vacância', { ...ctx, c });
          } else {
            check(c.vacancy !== null, 'I2 vazia tem motivo', { ...ctx, c });
          }
        }

        // I3 — nenhuma câmera aparece duas vezes na grade.
        const ids = r.cells.map((c) => c.cameraId).filter(Boolean);
        check(new Set(ids).size === ids.length, 'I3 sem duplicata exibida', ctx);
        check(r.filled === ids.length, 'I3 filled coerente', ctx);

        // I4 — posição é prova: toda câmera exibida está exatamente onde foi salva.
        for (const c of r.cells) {
          if (!c.cameraId) continue;
          const origin = saved.find(
            (s) => s.slot_index === c.slotIndex && s.camera_id === c.cameraId,
          );
          check(Boolean(origin), 'I4 câmera deslocada de posição', { ...ctx, c });
        }

        // I5 — overflow nunca cai dentro da capacidade por 'out_of_capacity'.
        for (const o of r.overflow) {
          if (o.reason === 'out_of_capacity') {
            check(o.slotIndex >= capacity, 'I5 overflow indevido', { ...ctx, o });
          }
          if (o.reason === 'invalid_slot') {
            check(
              !Number.isInteger(o.slotIndex) || o.slotIndex < 0 || o.slotIndex > MAX_SLOT_INDEX,
              'I5 invalid_slot mal classificado',
              { ...ctx, o },
            );
          }
        }

        // I6 — degradação é fato, não opinião.
        check(r.degraded === (r.lost > 0), 'I6 degraded', ctx);
        if (!r.degraded) {
          check(r.overflow.length === 0, 'I6 íntegro sem overflow', ctx);
          check(
            r.cells.every((c) => c.vacancy === null || c.vacancy === 'empty'),
            'I6 íntegro sem vacância acusatória',
            ctx,
          );
          check(!describeRestore(r).includes('não honrada'), 'I6 texto não acusa perda', ctx);
        } else {
          check(describeRestore(r).includes('não honrada'), 'I6 texto declara perda', ctx);
        }

        // I7 — pureza/determinismo: repetir a chamada devolve o mesmo resultado.
        const again = restoreFavoriteView({ layout, saved, visibleCameraIds: visible });
        check(JSON.stringify(again) === JSON.stringify(r), 'I7 determinismo', ctx);
        check(JSON.stringify(saved) === savedSnapshot, 'I7 entrada não mutada', ctx);

        // I8 — ida e volta não recompacta buracos.
        const roundTrip = restoreFavoriteView({
          layout,
          saved: cellsToSavedSlots(r.cells),
          visibleCameraIds: visible,
        });
        check(
          roundTrip.cells.every((c, i) => c.cameraId === r.cells[i].cameraId),
          'I8 round-trip preserva posições',
          ctx,
        );
        check(!roundTrip.degraded, 'I8 round-trip é íntegro', ctx);

        // I9 — ampliar o layout nunca perde o que já cabia.
        const bigger = restoreFavoriteView({ layout: '4x4', saved, visibleCameraIds: visible });
        for (const c of r.cells) {
          if (c.cameraId) {
            check(bigger.cells[c.slotIndex].cameraId === c.cameraId, 'I9 layout maior preserva', {
              ...ctx,
              c,
            });
          }
        }
      }
    }
  }
}

// Nomes de favorito
const NAME_CASES = [
  ['', null],
  ['   ', null],
  ['Pátio', 'Pátio'],
  ['  Portaria   Norte ', 'Portaria Norte'],
  ['x'.repeat(100), 'x'.repeat(100)],
  ['x'.repeat(101), null],
];
for (const [input, expected] of NAME_CASES) {
  check(normalizeFavoriteName(input) === expected, 'nome normalizado', { input });
}

// Caso-âncora: favorito com buraco no meio e câmera apagada.
{
  const saved = [
    { slot_index: 0, camera_id: 'cam-00' },
    { slot_index: 2, camera_id: 'cam-99' },
    { slot_index: 3, camera_id: 'cam-01' },
  ];
  const r = restoreFavoriteView({
    layout: '2x2',
    saved,
    visibleCameraIds: ['cam-00', 'cam-01'],
  });
  check(r.cells[0].cameraId === 'cam-00', 'âncora slot 0', {});
  check(r.cells[1].cameraId === null && r.cells[1].vacancy === 'empty', 'âncora buraco', {});
  check(r.cells[2].vacancy === 'camera_removed', 'âncora removida', {});
  check(r.cells[3].cameraId === 'cam-01', 'âncora não deslocou', {});
  check(r.filled === 2 && r.lost === 1 && r.degraded, 'âncora contagem', {});
}

if (failures.length > 0) {
  console.error(`\n❌ Onda 188 — ${failures.length} falha(s):`);
  console.error(failures.slice(0, 20).join('\n'));
  process.exit(1);
}

console.log(`✅ Onda 188 — visualizações favoritas: ${assertions.toLocaleString('pt-BR')} asserções, 0 falhas.`);
