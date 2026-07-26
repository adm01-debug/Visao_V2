#!/usr/bin/env node
/**
 * Onda 112 — Simulação exaustiva da detecção de relógio descalibrado por câmera.
 *
 * Varre o produto cartesiano de (amostras × desvio mediano × sinal × máximo
 * observado × linhas sentinela × estado de saúde × conjunto de limiares) e
 * valida as invariantes I1..I8 de `src/lib/clockSkew.ts`.
 *
 * Uso: `npm run simulate:wave112`
 */
import {
  classifyClockSkew,
  CLOCK_SKEW_SEVERITY_RANK,
  DEFAULT_CLOCK_SKEW_THRESHOLDS,
  formatSkew,
} from '../src/lib/clockSkew.ts';

const SAMPLE_COUNTS = [0, 1, 4, 5, 6, 40, 5000];
const ABS_SKEWS = [0, 1, 59, 299, 300, 301, 900, 3599, 3600, 3601, 86400, 1_000_000];
const SIGNS = [1, -1];
const MAX_MULTIPLIERS = [0.5, 1, 3];
const SENTINELS = [
  { sentinelPastRows: 0, sentinelFutureRows: 0 },
  { sentinelPastRows: 1, sentinelFutureRows: 0 },
  { sentinelPastRows: 0, sentinelFutureRows: 7 },
  { sentinelPastRows: 12, sentinelFutureRows: 3 },
];
const HEALTH = ['online', 'degraded', 'offline', 'unknown', null];
const THRESHOLD_SETS = [
  DEFAULT_CLOCK_SKEW_THRESHOLDS,
  { minSamples: 1, warnSeconds: 60, criticalSeconds: 600 },
  { minSamples: 20, warnSeconds: 1800, criticalSeconds: 7200 },
];

const failures = [];
let scenarios = 0;

function check(id, ok, detail) {
  if (!ok) failures.push(`${id}: ${detail}`);
}

for (const thresholds of THRESHOLD_SETS) {
  for (const sampleCount of SAMPLE_COUNTS) {
    for (const abs of ABS_SKEWS) {
      for (const sign of SIGNS) {
        for (const mult of MAX_MULTIPLIERS) {
          for (const sentinel of SENTINELS) {
            for (const healthState of HEALTH) {
              scenarios += 1;
              const median = abs * sign;
              const sample = {
                cameraId: `cam-${scenarios}`,
                sampleCount,
                medianSkewSeconds: median,
                maxAbsSkewSeconds: abs * mult,
                healthState,
                ...sentinel,
              };
              const finding = classifyClockSkew(sample, thresholds);
              const sentinelRows = sentinel.sentinelPastRows + sentinel.sentinelFutureRows;

              // I1 — amostras insuficientes nunca viram alerta (salvo sentinela).
              if (sampleCount < thresholds.minSamples && sentinelRows === 0) {
                check('I1', finding.severity === 'insufficient_data', `severidade ${finding.severity}`);
                check('I1b', finding.suppressed === true, 'achado sem amostras deveria ser suprimido');
              } else if (sentinelRows > 0) {
                // I5 — carimbo impossível é sempre crítico.
                check('I5', finding.severity === 'critical', `sentinela ⇒ ${finding.severity}`);
              } else if (abs >= thresholds.criticalSeconds) {
                check('I4', finding.severity === 'critical', `${abs}s ⇒ ${finding.severity}`);
              } else if (abs >= thresholds.warnSeconds) {
                check('I3', finding.severity === 'warning', `${abs}s ⇒ ${finding.severity}`);
              } else {
                check('I2', finding.severity === 'ok', `${abs}s ⇒ ${finding.severity}`);
              }

              // I7 — o sinal não altera a severidade, só a direção.
              const mirrored = classifyClockSkew({ ...sample, medianSkewSeconds: -median }, thresholds);
              check('I7', mirrored.severity === finding.severity, 'severidade assimétrica no sinal');
              const expectedDirection = abs < 1 ? 'none' : sign > 0 ? 'ahead' : 'behind';
              check('I7b', finding.direction === expectedDirection, `direção ${finding.direction}`);

              // I8 — supressão segue o estado de saúde, sem mexer na severidade.
              if (finding.severity !== 'insufficient_data') {
                check('I8', finding.suppressed === (healthState !== 'online'), `supressão ${finding.suppressed} para ${healthState}`);
              }

              // Consistência do agregado: máximo ≥ |mediana|.
              check('I9', finding.maxAbsSkewSeconds >= Math.abs(median) - 1e-9, 'máximo menor que a mediana');

              // Robustez: entradas inválidas jamais lançam exceção.
              try {
                classifyClockSkew(
                  { ...sample, sampleCount: NaN, medianSkewSeconds: NaN, maxAbsSkewSeconds: undefined },
                  thresholds,
                );
              } catch (error) {
                check('I10', false, `exceção com entrada inválida: ${error.message}`);
              }
            }
          }
        }
      }
    }
  }
}

// I6 — monotonicidade: a severidade nunca cai quando o desvio cresce.
for (const thresholds of THRESHOLD_SETS) {
  let previous = -1;
  for (const abs of [...ABS_SKEWS].sort((a, b) => a - b)) {
    scenarios += 1;
    const rank = CLOCK_SKEW_SEVERITY_RANK[
      classifyClockSkew(
        {
          cameraId: 'mono',
          sampleCount: 1000,
          medianSkewSeconds: abs,
          maxAbsSkewSeconds: abs,
          sentinelPastRows: 0,
          sentinelFutureRows: 0,
          healthState: 'online',
        },
        thresholds,
      ).severity
    ];
    check('I6', rank >= previous, `rank caiu de ${previous} para ${rank} em ${abs}s`);
    previous = rank;
  }
}

// Formatação legível não deve produzir NaN em nenhuma faixa.
for (const seconds of [-1_000_000, -3600, -61, 0, 30, 3600, 172_800]) {
  scenarios += 1;
  check('I11', !formatSkew(seconds).includes('NaN'), `formatSkew(${seconds})`);
}

console.log(`Onda 112 — cenários simulados: ${scenarios}`);
if (failures.length > 0) {
  console.error(`❌ ${failures.length} violação(ões) de invariante:`);
  for (const failure of failures.slice(0, 20)) console.error(`   - ${failure}`);
  process.exit(1);
}
console.log('✅ Invariantes I1..I11 preservadas em todos os cenários.');
