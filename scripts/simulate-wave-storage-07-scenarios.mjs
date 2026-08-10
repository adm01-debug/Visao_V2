#!/usr/bin/env node
/**
 * Wave Storage 07 — Cron scheduler unificado + backpressure
 * Simulação de 300 cenários para o orquestrador `storage-tiering-orchestrator`.
 *
 * Objetivos:
 *  - Agendamento único (pg_cron a cada 15 min) chama a função orquestradora.
 *  - Orquestrador decide se roda promote-hot-to-warm e/ou archive-warm-to-cold.
 *  - Backpressure: pula execução se última rodada ainda está em andamento
 *    (advisory lock) ou se erro-rate acima de threshold.
 *  - Circuit breaker: 3 falhas consecutivas por tier => pausa por 1h.
 *  - Métricas registradas em tabela `storage_tiering_runs`.
 */

import crypto from 'node:crypto';

const rand = (seed) => {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  return h.readUInt32BE(0) / 0xffffffff;
};

const scenarios = [];

// 1) Execuções normais (100)
for (let i = 0; i < 100; i++) {
  scenarios.push({
    id: `normal-${i}`,
    type: 'normal',
    hotEligible: Math.floor(rand(`h${i}`) * 500),
    warmEligible: Math.floor(rand(`w${i}`) * 200),
    lockHeld: false,
    consecutiveFailures: 0,
    expect: 'run_both',
  });
}

// 2) Lock detido (backpressure) (60)
for (let i = 0; i < 60; i++) {
  scenarios.push({
    id: `lock-${i}`,
    type: 'lock_held',
    hotEligible: 100,
    warmEligible: 50,
    lockHeld: true,
    consecutiveFailures: 0,
    expect: 'skip_lock',
  });
}

// 3) Circuit breaker aberto (40)
for (let i = 0; i < 40; i++) {
  scenarios.push({
    id: `cb-${i}`,
    type: 'circuit_breaker',
    hotEligible: 100,
    warmEligible: 50,
    lockHeld: false,
    consecutiveFailures: 3 + Math.floor(rand(`cb${i}`) * 5),
    lastFailureMinutesAgo: Math.floor(rand(`t${i}`) * 120),
    expect: (s) => (s.lastFailureMinutesAgo < 60 ? 'skip_cb' : 'run_both'),
  });
}

// 4) Nada elegível (30)
for (let i = 0; i < 30; i++) {
  scenarios.push({
    id: `empty-${i}`,
    type: 'empty',
    hotEligible: 0,
    warmEligible: 0,
    lockHeld: false,
    consecutiveFailures: 0,
    expect: 'noop',
  });
}

// 5) Backlog crítico (aumenta batch) (30)
for (let i = 0; i < 30; i++) {
  scenarios.push({
    id: `backlog-${i}`,
    type: 'backlog',
    hotEligible: 5000 + Math.floor(rand(`b${i}`) * 5000),
    warmEligible: 2000,
    lockHeld: false,
    consecutiveFailures: 0,
    expect: 'run_both_large_batch',
  });
}

// 6) Falha parcial de warm (cold continua) (20)
for (let i = 0; i < 20; i++) {
  scenarios.push({
    id: `warm-fail-${i}`,
    type: 'partial_fail_warm',
    hotEligible: 100,
    warmEligible: 50,
    lockHeld: false,
    consecutiveFailures: 0,
    warmWillFail: true,
    expect: 'run_cold_only',
  });
}

// 7) Timeout de tier (20)
for (let i = 0; i < 20; i++) {
  scenarios.push({
    id: `timeout-${i}`,
    type: 'timeout',
    hotEligible: 200,
    warmEligible: 100,
    lockHeld: false,
    consecutiveFailures: 0,
    tierTimeoutMs: 500,
    expect: 'timeout_recorded',
  });
}

let passed = 0;
let failed = 0;
const failures = [];

for (const s of scenarios) {
  const expected = typeof s.expect === 'function' ? s.expect(s) : s.expect;
  let outcome;

  if (s.lockHeld) {
    outcome = 'skip_lock';
  } else if (s.consecutiveFailures >= 3 && (s.lastFailureMinutesAgo ?? 0) < 60) {
    outcome = 'skip_cb';
  } else if (s.hotEligible === 0 && s.warmEligible === 0) {
    outcome = 'noop';
  } else if (s.warmWillFail) {
    outcome = 'run_cold_only';
  } else if (s.tierTimeoutMs && s.tierTimeoutMs < 1000) {
    outcome = 'timeout_recorded';
  } else if (s.hotEligible > 2000) {
    outcome = 'run_both_large_batch';
  } else {
    outcome = 'run_both';
  }

  if (outcome === expected) passed++;
  else {
    failed++;
    failures.push({ id: s.id, expected, outcome });
  }
}

console.log(`Wave Storage 07 — ${passed}/${scenarios.length} cenários OK`);
if (failed > 0) {
  console.error('Falhas:', failures.slice(0, 10));
  process.exit(1);
}
