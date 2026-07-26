#!/usr/bin/env node
/**
 * Onda 116 — Simulador exaustivo da correlação de causa raiz.
 *
 * Varre o produto cartesiano de janelas de backlog, populações de câmeras com
 * relógio descalibrado, assinaturas de quarentena e idades de achado,
 * verificando invariantes que precisam valer para QUALQUER entrada. O objetivo
 * não é medir acurácia (não há gabarito de produção), e sim provar que a
 * política nunca produz um estado incoerente — atribuição acima de 100%,
 * culpado sem evidência, ou dado velho aumentando a confiança.
 *
 * Uso: `npm run simulate:wave116`
 */
import {
  correlateRootCause,
  summarizeRootCause,
  DEFAULT_ROOT_CAUSE_THRESHOLDS,
} from '../src/lib/rootCauseCorrelation.ts';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 6, 26, 3, 0, 0);
const PARENT = 'plate_detections';
const EMPTY = { pre2000: 0, future: 0, recentGap: 0, unknown: 0 };

const failures = [];
let scenarios = 0;
let assertions = 0;

function check(cond, label, ctx) {
  assertions += 1;
  if (!cond) {
    failures.push(`${label} :: ${JSON.stringify(ctx)}`);
  }
}

const ROWS_ADDED = [-500, 0, 1, 99, 100, 500, 5_000, 250_000];
const WINDOW_HOURS = [0, 0.5, 6, 24, 168];
const SEVERITIES = ['insufficient_data', 'ok', 'warning', 'critical'];
const DIRECTIONS = ['none', 'ahead', 'behind'];
const SENTINELS = [0, 1, 40, 900, 400_000];
const AGES_H = [0, 12, 47.9, 48.1, 400];
const SAMPLES = [1, 5, 19, 20, 500];
const BUCKETS = [
  { pre2000: 0, future: 0, recentGap: 0, unknown: 0 },
  { pre2000: 1_000, future: 0, recentGap: 0, unknown: 0 },
  { pre2000: 0, future: 1_000, recentGap: 0, unknown: 0 },
  { pre2000: 500, future: 500, recentGap: 200, unknown: 10 },
];
const SUPPRESSED = [false, true];

const CONF_RANK = { low: 0, medium: 1, high: 2 };

function finding(overrides) {
  return {
    cameraId: 'cam-0001',
    cameraName: 'Portaria',
    sourceTable: PARENT,
    severity: 'critical',
    direction: 'behind',
    sampleCount: 100,
    medianSkewSeconds: -90_000,
    sentinelRows: 500,
    detectedAtMs: NOW - HOUR,
    suppressed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------- varredura 1
// Espaço completo de uma câmera única contra todas as formas de backlog.
for (const rowsAdded of ROWS_ADDED) {
  for (const windowHours of WINDOW_HOURS) {
    for (const severity of SEVERITIES) {
      for (const direction of DIRECTIONS) {
        for (const sentinelRows of SENTINELS) {
          for (const ageH of AGES_H) {
            for (const sampleCount of SAMPLES) {
              for (const buckets of BUCKETS) {
                for (const suppressed of SUPPRESSED) {
                  scenarios += 1;
                  const f = finding({
                    severity,
                    direction,
                    sentinelRows,
                    sampleCount,
                    suppressed,
                    detectedAtMs: NOW - ageH * HOUR,
                  });
                  const [c] = correlateRootCause({
                    nowMs: NOW,
                    growth: [
                      { parent: PARENT, currentRows: 10_000, rowsAddedInWindow: rowsAdded, windowHours, buckets },
                    ],
                    skewFindings: [f],
                  });
                  const ctx = { rowsAdded, windowHours, severity, direction, sentinelRows, ageH, sampleCount, suppressed };

                  // I1 — atribuição sempre em [0,1] e complementar ao resíduo.
                  check(c.attributedRatio >= 0 && c.attributedRatio <= 1, 'I1 atribuição fora de [0,1]', ctx);
                  check(
                    c.verdict === 'no_backlog' || c.verdict === 'insufficient_data'
                      ? true
                      : Math.abs(c.attributedRatio + c.unexplainedRatio - 1) < 1e-9,
                    'I1 atribuído + inexplicado ≠ 1',
                    ctx,
                  );

                  // I2 — sem crescimento relevante não há culpados.
                  if (windowHours <= 0) {
                    check(c.verdict === 'insufficient_data', 'I2 janela inválida deveria ser insufficient_data', ctx);
                  } else if (rowsAdded < DEFAULT_ROOT_CAUSE_THRESHOLDS.minRowsAdded) {
                    check(c.verdict === 'no_backlog', 'I2 ruído deveria ser no_backlog', ctx);
                    check(c.culprits.length === 0, 'I2 no_backlog com culpados', ctx);
                  }

                  // I3 — culpado exige evidência: severidade acionável, não
                  // silenciado, com linhas-sentinela e tabela correspondente.
                  for (const culprit of c.culprits) {
                    check(!suppressed, 'I3 câmera silenciada imputada', ctx);
                    check(severity === 'warning' || severity === 'critical', 'I3 severidade inócua imputada', ctx);
                    check(sentinelRows > 0, 'I3 imputação sem linhas-sentinela', ctx);
                    check(culprit.contributionRatio > 0, 'I3 culpado com contribuição nula', ctx);
                    check(culprit.estimatedRows >= 0, 'I3 linhas estimadas negativas', ctx);
                    check(culprit.estimatedRows <= Math.max(0, rowsAdded), 'I3 imputação acima do crescimento', ctx);
                  }

                  // I4 — nunca imputa mais linhas do que o backlog cresceu.
                  const imputed = c.culprits.reduce((a, x) => a + x.estimatedRows, 0);
                  check(imputed <= Math.max(0, rowsAdded) + c.culprits.length, 'I4 soma imputada excede crescimento', ctx);

                  // I5 — sempre há recomendação acionável em PT-BR.
                  check(typeof c.recommendation === 'string' && c.recommendation.length > 10, 'I5 recomendação ausente', ctx);
                }
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- varredura 2
// Monotonicidade da confiança frente ao envelhecimento e à amostragem.
for (const severity of ['warning', 'critical']) {
  for (const direction of DIRECTIONS) {
    for (const buckets of BUCKETS) {
      for (const sampleCount of SAMPLES) {
        scenarios += 1;
        const mk = (ageH) =>
          correlateRootCause({
            nowMs: NOW,
            growth: [{ parent: PARENT, currentRows: 1e6, rowsAddedInWindow: 10_000, windowHours: 24, buckets }],
            skewFindings: [finding({ severity, direction, sampleCount, sentinelRows: 5_000, detectedAtMs: NOW - ageH * HOUR })],
          })[0];
        const fresh = mk(1).culprits[0];
        const stale = mk(400).culprits[0];
        if (fresh && stale) {
          check(
            CONF_RANK[stale.confidence] <= CONF_RANK[fresh.confidence],
            'I6 achado velho elevou a confiança',
            { severity, direction, sampleCount, buckets },
          );
          check(
            Math.abs(stale.contributionRatio - fresh.contributionRatio) < 1e-9,
            'I6 idade alterou o rateio (deveria afetar só a confiança)',
            { severity, direction, sampleCount },
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------- varredura 3
// Rateio multi-câmera: proporcionalidade, ordenação estável e determinismo
// frente a permutações da entrada.
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i += 1) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

for (const rowsAdded of [1_000, 20_000, 500_000]) {
  for (const buckets of BUCKETS) {
    for (const s1 of ['warning', 'critical']) {
      for (const s2 of ['warning', 'critical']) {
        for (const n1 of [10, 300, 9_000]) {
          for (const n2 of [10, 300, 9_000]) {
            const base = [
              finding({ cameraId: 'cam-a', cameraName: 'A', severity: s1, sentinelRows: n1, direction: 'behind' }),
              finding({ cameraId: 'cam-b', cameraName: 'B', severity: s2, sentinelRows: n2, direction: 'ahead' }),
              finding({ cameraId: 'cam-c', cameraName: 'C', severity: 'ok', sentinelRows: 9_999, direction: 'behind' }),
              finding({ cameraId: 'cam-d', cameraName: 'D', severity: 'critical', sentinelRows: 9_999, sourceTable: 'recognition_logs' }),
            ];
            const results = permutations(base).map(
              (perm) =>
                correlateRootCause({
                  nowMs: NOW,
                  growth: [{ parent: PARENT, currentRows: 1e6, rowsAddedInWindow: rowsAdded, windowHours: 24, buckets }],
                  skewFindings: perm,
                })[0],
            );
            scenarios += results.length;
            const canonical = JSON.stringify(results[0]);
            for (const r of results) {
              check(JSON.stringify(r) === canonical, 'I7 resultado dependente da ordem de entrada', { rowsAdded, s1, s2, n1, n2 });
            }
            const r0 = results[0];
            check(
              r0.culprits.every((c) => c.cameraId === 'cam-a' || c.cameraId === 'cam-b'),
              'I8 imputou câmera de outra tabela ou sem severidade acionável',
              { ids: r0.culprits.map((c) => c.cameraId) },
            );
            for (let i = 1; i < r0.culprits.length; i += 1) {
              check(
                r0.culprits[i - 1].contributionRatio >= r0.culprits[i].contributionRatio,
                'I9 culpados fora de ordem decrescente',
                {},
              );
            }
            // I10 — mais linhas-sentinela ⇒ contribuição não menor (mesma severidade).
            if (s1 === s2 && n1 > n2) {
              const a = r0.culprits.find((c) => c.cameraId === 'cam-a');
              const b = r0.culprits.find((c) => c.cameraId === 'cam-b');
              if (a && b) check(a.contributionRatio >= b.contributionRatio, 'I10 rateio não monotônico em linhas-sentinela', { n1, n2 });
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- varredura 4
// Agregação para o barramento de alertas: um pai inexplicado sempre domina.
for (const n of [0, 1, 3]) {
  for (const m of [0, 1, 3]) {
    scenarios += 1;
    const growth = [];
    for (let i = 0; i < n; i += 1) {
      growth.push({ parent: `unexplained_${i}`, currentRows: 1e5, rowsAddedInWindow: 50_000, windowHours: 24, buckets: EMPTY });
    }
    for (let i = 0; i < m; i += 1) {
      growth.push({ parent: `quiet_${i}`, currentRows: 10, rowsAddedInWindow: 0, windowHours: 24, buckets: EMPTY });
    }
    const summary = summarizeRootCause(correlateRootCause({ nowMs: NOW, growth, skewFindings: [] }));
    check(
      n > 0 ? summary.severity === 'critical' : summary.severity === 'ok',
      'I11 agregação de severidade incorreta',
      { n, m, severity: summary.severity },
    );
  }
}

console.log(`Onda 116 — cenários simulados: ${scenarios.toLocaleString('pt-BR')}`);
console.log(`Invariantes verificadas: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} falha(s):`);
  for (const f of failures.slice(0, 20)) console.error(` - ${f}`);
  process.exit(1);
}
console.log('✅ Todas as invariantes I1..I11 mantidas.');
