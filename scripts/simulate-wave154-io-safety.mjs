#!/usr/bin/env node
/**
 * Onda 154 — simulação de acionamento de I/O físico (etapa 8).
 *
 * O que estamos tentando quebrar: a promessa de que **nenhuma sequência de
 * comandos deixa uma saída travada em nível ativo sem que alguém tenha pedido
 * isso explicitamente**. Sirene presa ligada é o pior defeito possível deste
 * subsistema — pior que sirene que não toca, porque queima a confiança da
 * vizinhança no alarme inteiro.
 *
 * Modelo de referência: reimplementação independente da decisão, para que o
 * gate compare duas escritas da mesma regra em vez de comparar o código com
 * ele mesmo. Divergência entre modelo e implementação é falha do gate.
 *
 * Cobertura:
 *  A. matriz combinatória (capacidade × direção × habilitado × modo × estado ×
 *     comando × folga × duração)
 *  B. trajetórias vivas: 400 sequências pseudoaleatórias de 40 comandos, com
 *     relógio avançando, verificando 5 invariantes a cada passo.
 */
import { decideActuation, MIN_PULSE_MS, MAX_PULSE_MS, ABSOLUTE_MIN_INTERVAL_MS } from './model-io-safety.mjs';

/* ------------------------- modelo de referência ------------------------- */

function modelDecide(port, command, hasCapability, nowMs) {
  if (!hasCapability) return { allowed: false, reason: 'missing_capability' };
  if (!port) return { allowed: false, reason: 'unknown_port' };
  if (port.direction !== 'output') return { allowed: false, reason: 'not_an_output' };
  if (!port.enabled) return { allowed: false, reason: 'port_disabled' };

  const interval = Math.max(ABSOLUTE_MIN_INTERVAL_MS, port.minIntervalMs);
  const since = port.lastActuatedAtMs == null ? Infinity : nowMs - port.lastActuatedAtMs;

  if (command.kind === 'set_inactive') {
    return { allowed: true, kind: 'set_inactive', effectiveMs: null, nextAllowedAtMs: nowMs + interval };
  }
  if (command.kind === 'set_active' && port.outputMode !== 'bistable') {
    return { allowed: false, reason: 'hold_not_supported' };
  }
  if (command.kind === 'set_active' && port.lastState === 'active') {
    return { allowed: false, reason: 'already_in_state' };
  }
  if (since < interval) {
    return { allowed: false, reason: 'too_soon', retryAfterMs: Math.max(0, Math.ceil(interval - since)) };
  }
  if (command.kind === 'set_active') {
    return { allowed: true, kind: 'set_active', effectiveMs: null, nextAllowedAtMs: nowMs + interval };
  }
  const asked = command.durationMs == null ? port.pulseMs : command.durationMs;
  const duration = Number.isFinite(asked) ? Math.trunc(asked) : NaN;
  if (!Number.isFinite(duration) || duration < MIN_PULSE_MS) return { allowed: false, reason: 'duration_too_short' };
  if (duration > MAX_PULSE_MS) return { allowed: false, reason: 'duration_too_long' };
  return { allowed: true, kind: 'pulse', effectiveMs: duration, nextAllowedAtMs: nowMs + duration + interval };
}

const same = (a, b) => {
  if (a.allowed !== b.allowed) return false;
  if (!a.allowed) return a.reason === b.reason && (a.retryAfterMs ?? null) === (b.retryAfterMs ?? null);
  return a.kind === b.kind && (a.effectiveMs ?? null) === (b.effectiveMs ?? null) && a.nextAllowedAtMs === b.nextAllowedAtMs;
};

/* --------------------------- A. combinatória ---------------------------- */

const violations = [];
let scenarios = 0;
const NOW = 1_800_000_000_000;

const DIRECTIONS = ['output', 'input'];
const MODES = ['monostable', 'bistable'];
const STATES = ['active', 'inactive', 'unknown'];
const COMMANDS = ['pulse', 'set_active', 'set_inactive'];
const GAPS = [null, 0, 1, 249, 250, 999, 1000, 5000];
const DURATIONS = [undefined, null, 0, 99, 100, 2000, 60000, 60001, NaN, -5, 1.9];
const INTERVALS = [0, 250, 1000];

for (const hasCapability of [true, false]) {
  for (const direction of DIRECTIONS) {
    for (const enabled of [true, false]) {
      for (const outputMode of MODES) {
        for (const lastState of STATES) {
          for (const minIntervalMs of INTERVALS) {
            for (const gap of GAPS) {
              for (const kind of COMMANDS) {
                for (const durationMs of DURATIONS) {
                  scenarios++;
                  const port = {
                    id: 'p', direction, enabled, outputMode,
                    pulseMs: 2000, minIntervalMs, lastState,
                    lastActuatedAtMs: gap == null ? null : NOW - gap,
                  };
                  const command = { kind, durationMs };
                  const real = decideActuation({ port, command, hasCapability, nowMs: NOW });
                  const model = modelDecide(port, command, hasCapability, NOW);
                  if (!same(real, model)) {
                    violations.push(`divergência: ${JSON.stringify({ port, command, hasCapability, real, model })}`);
                  }
                  // Invariante 1: pulso liberado sempre tem duração dentro dos limites.
                  if (real.allowed && real.kind === 'pulse') {
                    if (!(real.effectiveMs >= MIN_PULSE_MS && real.effectiveMs <= MAX_PULSE_MS)) {
                      violations.push(`pulso fora dos limites: ${real.effectiveMs}`);
                    }
                  }
                  // Invariante 2: travar ligada nunca sai em porta monoestável.
                  if (real.allowed && real.kind === 'set_active' && outputMode !== 'bistable') {
                    violations.push('travamento liberado em porta monoestável');
                  }
                  // Invariante 3: sem capacidade, nada passa.
                  if (!hasCapability && real.allowed) violations.push('acionamento sem capacidade');
                  // Invariante 4: entrada nunca aciona.
                  if (direction === 'input' && real.allowed) violations.push('entrada digital acionada');
                }
              }
            }
          }
        }
      }
    }
  }
}

/* ------------------------- B. trajetórias vivas -------------------------- */

let seed = 154;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

for (let traj = 0; traj < 400; traj++) {
  const outputMode = pick(MODES);
  const port = {
    id: 'p', direction: 'output', enabled: true, outputMode,
    pulseMs: pick([100, 500, 2000, 30000]),
    minIntervalMs: pick([0, 250, 1000, 5000]),
    lastState: 'inactive',
    lastActuatedAtMs: null,
  };
  let clock = NOW;
  let lastAllowedAt = -Infinity;

  for (let step = 0; step < 40; step++) {
    scenarios++;
    clock += Math.floor(rnd() * 4000);
    const kind = pick(COMMANDS);
    const command = { kind, durationMs: pick(DURATIONS) };
    const decision = decideActuation({ port, command, hasCapability: true, nowMs: clock });
    if (!same(decision, modelDecide(port, command, true, clock))) {
      violations.push(`trajetória ${traj} passo ${step}: divergência do modelo`);
    }

    if (!decision.allowed) continue;

    // Invariante 5: dois acionamentos que MEXEM na saída nunca ficam mais
    // próximos que o piso absoluto. Desligar é isento — é a saída de emergência.
    if (decision.kind !== 'set_inactive') {
      if (clock - lastAllowedAt < ABSOLUTE_MIN_INTERVAL_MS) {
        violations.push(`trajetória ${traj}: acionamentos a ${clock - lastAllowedAt} ms`);
      }
      lastAllowedAt = clock;
      port.lastActuatedAtMs = clock;
    }

    if (decision.kind === 'pulse') {
      // O pulso sempre volta ao repouso — é o contrato do monoestável.
      clock += decision.effectiveMs;
      port.lastState = 'inactive';
    } else if (decision.kind === 'set_active') {
      port.lastState = 'active';
    } else {
      port.lastState = 'inactive';
    }
  }

  // Invariante 6 (fim de trajetória): saída só termina ativa se o último
  // comando aceito foi um travamento explícito em porta biestável.
  if (port.lastState === 'active' && outputMode !== 'bistable') {
    violations.push(`trajetória ${traj}: saída monoestável terminou travada ativa`);
  }
}

/* ------------------------------ relatório -------------------------------- */

console.log('Onda 154 — simulação de I/O de alarme físico');
console.log(`  cenários avaliados : ${scenarios}`);
console.log(`  violações          : ${violations.length}`);
for (const v of violations.slice(0, 20)) console.log(`   - ${v}`);
if (violations.length > 0) process.exit(1);
console.log('  resultado          : OK');
