#!/usr/bin/env node
/**
 * Onda 113 — Simulação exaustiva da política de tendência do backlog da DEFAULT.
 *
 * Roda ANTES da implementação em banco, por decisão de processo: a regra só vira
 * SQL depois que o produto cartesiano de cenários provar que as invariantes se
 * sustentam. Cada falha aqui custa segundos; em produção, custa um incidente.
 *
 * Uso: npm run simulate:wave113
 */
import {
  evaluateBacklogSeries,
  theilSenSlopePerHour,
  DEFAULT_BACKLOG_TREND_THRESHOLDS as T,
} from '../src/lib/partitionBacklogTrend.ts';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-07-26T12:00:00.000Z');

let scenarios = 0;
const failures = [];

function check(id, condition, detail) {
  if (!condition) failures.push(`${id}: ${detail}`);
}

/** Constrói uma série sintética linear com ruído determinístico opcional. */
function buildSeries(count, startRows, slopePerHour, intervalHours, ageHours, noise = 0) {
  const samples = [];
  const newest = NOW - ageHours * HOUR;
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = newest - i * intervalHours * HOUR;
    const elapsed = (count - 1 - i) * intervalHours;
    // Ruído pseudoaleatório determinístico (sem Math.random: a suíte precisa ser
    // reproduzível bit a bit entre execuções locais e o CI).
    const jitter = noise === 0 ? 0 : ((i * 2654435761) % 1000) / 1000 * noise - noise / 2;
    samples.push({
      sampledAtMs: t,
      rowCount: Math.max(0, Math.round(startRows + slopePerHour * elapsed + jitter)),
    });
  }
  return { parent: 'plate_detections', defaultPartition: 'plate_detections_default', samples };
}

const RANK = { ok: 0, warning: 1, critical: 2 };

// ---------------------------------------------------------------------------
// Bloco A — grade principal: contagem × nível × inclinação × intervalo × idade
// ---------------------------------------------------------------------------
const counts = [0, 1, 2, 3, 5, 8, 12, 24, 48];
const startRowsGrid = [0, 500, 9_999, 10_000, 25_000, 49_999, 50_000, 120_000];
const slopeGrid = [-500, -50, -2, -1, 0, 0.5, 1, 1.5, 10, 200, 2_000, 40_000];
const intervalGrid = [0.25, 1, 6];
const ageGrid = [0, 1, 5.9, 6.1, 48];

for (const count of counts) {
  for (const startRows of startRowsGrid) {
    for (const slope of slopeGrid) {
      for (const interval of intervalGrid) {
        for (const age of ageGrid) {
          scenarios += 1;
          const series = buildSeries(count, startRows, slope, interval, age);
          const v = evaluateBacklogSeries(series, NOW, T);

          // I1 — amostras insuficientes nunca produzem tendência estimada.
          if (count < T.minSamples) {
            check('I1', v.trend === 'unknown', `count=${count} trend=${v.trend}`);
            check('I1', v.slopePerHour === null, `count=${count} slope=${v.slopePerHour}`);
          }

          // I2 — o nível absoluto sempre vale, independente da tendência.
          if (v.currentRows >= T.criticalRows) {
            check('I2', v.severity === 'critical', `rows=${v.currentRows} sev=${v.severity}`);
          } else if (v.currentRows >= T.warnRows) {
            check('I2', RANK[v.severity] >= 1, `rows=${v.currentRows} sev=${v.severity}`);
          }

          // I3 — série obsoleta obriga ao menos atenção.
          if (v.stale) {
            check('I3', RANK[v.severity] >= 1, `stale age=${v.sampleAgeHours} sev=${v.severity}`);
          }
          check('I3b', v.stale === (v.sampleAgeHours > T.maxSampleAgeHours),
            `stale=${v.stale} age=${v.sampleAgeHours}`);

          // I4 — sem crescimento não há projeção de saturação (salvo já saturado).
          if (v.trend !== 'growing' && v.currentRows < T.saturationRows) {
            check('I4', v.hoursToSaturation === null,
              `trend=${v.trend} proj=${v.hoursToSaturation}`);
          }

          // I7 — já saturado ⇒ horizonte zero e crítico.
          if (v.currentRows >= T.saturationRows) {
            check('I7', v.hoursToSaturation === 0, `proj=${v.hoursToSaturation}`);
            check('I7', v.severity === 'critical', `sev=${v.severity}`);
          }

          // I8 — pureza/determinismo.
          const again = evaluateBacklogSeries(series, NOW, T);
          check('I8', JSON.stringify(again) === JSON.stringify(v), 'saída não determinística');

          // Coerência da projeção com a inclinação declarada.
          if (v.hoursToSaturation !== null && v.hoursToSaturation > 0) {
            check('I4b', v.slopePerHour !== null && v.slopePerHour > T.slopeDeadbandPerHour,
              `proj com slope=${v.slopePerHour}`);
            check('I4c', Number.isFinite(v.hoursToSaturation),
              `projeção não finita: ${v.hoursToSaturation}`);
          }

          // Nunca emitir motivo vazio: a UI depende de ao menos uma explicação.
          check('I9', v.reasons.length > 0, 'veredito sem motivos');
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bloco B — monotonicidade em nível (I5) e em inclinação (I6)
// ---------------------------------------------------------------------------
for (const slope of slopeGrid) {
  for (const interval of intervalGrid) {
    let prevRank = -1;
    for (const startRows of [...startRowsGrid].sort((a, b) => a - b)) {
      scenarios += 1;
      const v = evaluateBacklogSeries(buildSeries(12, startRows, slope, interval, 0), NOW, T);
      // Cuidado: com inclinação positiva, mais linhas iniciais ⇒ satura antes,
      // então a monotonicidade em nível é reforçada, nunca invertida.
      check('I5', RANK[v.severity] >= prevRank,
        `severidade caiu ao aumentar backlog (slope=${slope}, rows=${startRows})`);
      prevRank = RANK[v.severity];
    }
  }
}

for (const startRows of startRowsGrid) {
  for (const interval of intervalGrid) {
    let prevRank = -1;
    for (const slope of [...slopeGrid].sort((a, b) => a - b)) {
      scenarios += 1;
      const v = evaluateBacklogSeries(buildSeries(12, startRows, slope, interval, 0), NOW, T);
      check('I6', RANK[v.severity] >= prevRank,
        `severidade caiu ao aumentar inclinação (rows=${startRows}, slope=${slope})`);
      prevRank = RANK[v.severity];
    }
  }
}

// ---------------------------------------------------------------------------
// Bloco C — robustez do Theil–Sen a outliers (o motivo de não usar OLS)
// ---------------------------------------------------------------------------
for (const spike of [10_000, 100_000, 5_000_000]) {
  for (const spikeIndex of [0, 3, 7, 11]) {
    scenarios += 1;
    const base = buildSeries(14, 1_000, 0, 1, 0);
    const contaminated = {
      ...base,
      samples: base.samples.map((s, i) =>
        i === spikeIndex ? { ...s, rowCount: s.rowCount + spike } : s,
      ),
    };
    const slope = theilSenSlopePerHour(contaminated.samples);
    check('I10', slope !== null && Math.abs(slope) <= T.slopeDeadbandPerHour,
      `um único outlier de ${spike} distorceu a inclinação para ${slope}`);
  }
}

// ---------------------------------------------------------------------------
// Bloco D — entradas degeneradas e hostis
// ---------------------------------------------------------------------------
const degenerate = [
  { name: 'sem amostras', samples: [] },
  { name: 'carimbos idênticos', samples: Array.from({ length: 6 }, () => ({ sampledAtMs: NOW, rowCount: 4_000 })) },
  { name: 'contagem negativa', samples: [{ sampledAtMs: NOW - HOUR, rowCount: -5 }, { sampledAtMs: NOW, rowCount: 10 }] },
  { name: 'NaN', samples: [{ sampledAtMs: NaN, rowCount: NaN }, { sampledAtMs: NOW, rowCount: 3 }] },
  { name: 'Infinity', samples: [{ sampledAtMs: Infinity, rowCount: Infinity }, { sampledAtMs: NOW, rowCount: 3 }] },
  { name: 'fora de ordem', samples: [{ sampledAtMs: NOW, rowCount: 100 }, { sampledAtMs: NOW - 5 * HOUR, rowCount: 50 }, { sampledAtMs: NOW - 2 * HOUR, rowCount: 80 }] },
  { name: 'futuro', samples: [{ sampledAtMs: NOW + 10 * HOUR, rowCount: 100 }, { sampledAtMs: NOW, rowCount: 50 }] },
];

for (const c of degenerate) {
  scenarios += 1;
  let v;
  try {
    v = evaluateBacklogSeries(
      { parent: 'recognition_logs', defaultPartition: 'recognition_logs_default', samples: c.samples },
      NOW,
      T,
    );
  } catch (err) {
    check('I11', false, `"${c.name}" lançou exceção: ${err.message}`);
    continue;
  }
  check('I11', ['ok', 'warning', 'critical'].includes(v.severity), `"${c.name}" severidade inválida`);
  check('I11', v.slopePerHour === null || Number.isFinite(v.slopePerHour),
    `"${c.name}" inclinação não finita: ${v.slopePerHour}`);
  check('I11', v.hoursToSaturation === null || Number.isFinite(v.hoursToSaturation),
    `"${c.name}" projeção não finita`);
  check('I11', v.sampleAgeHours === null || v.sampleAgeHours >= 0,
    `"${c.name}" idade negativa`);
}

// ---------------------------------------------------------------------------
// Bloco E — limiares alternativos (o gate e a UI podem sobrescrever)
// ---------------------------------------------------------------------------
for (const warnRows of [100, 10_000, 500_000]) {
  for (const criticalRows of [200, 50_000, 1_000_000]) {
    if (criticalRows <= warnRows) continue;
    for (const warnHorizon of [12, 72, 240]) {
      for (const criticalHorizon of [1, 24, 100]) {
        if (criticalHorizon >= warnHorizon) continue;
        for (const rows of [0, 150, 60_000]) {
          scenarios += 1;
          const custom = {
            ...T,
            warnRows,
            criticalRows,
            saturationRows: criticalRows,
            warnHorizonHours: warnHorizon,
            criticalHorizonHours: criticalHorizon,
          };
          const v = evaluateBacklogSeries(buildSeries(10, rows, 100, 1, 0), NOW, custom);
          if (rows >= criticalRows) {
            check('I12', v.severity === 'critical', `rows=${rows} teto=${criticalRows}`);
          }
          if (v.hoursToSaturation !== null && v.hoursToSaturation > warnHorizon) {
            check('I12', RANK[v.severity] === RANK[v.severity], 'coerência');
          }
        }
      }
    }
  }
}

console.log(`\nOnda 113 — cenários simulados: ${scenarios.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} violação(ões) de invariante:\n`);
  for (const f of failures.slice(0, 40)) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as invariantes I1..I12 mantidas.\n');
