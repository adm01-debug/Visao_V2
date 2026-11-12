import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_MIN_INTERVAL_MS,
  MAX_PULSE_MS,
  MIN_PULSE_MS,
  decideActuation,
  type IoCommand,
  type IoDecision,
  type IoPortConfig,
} from '../ioSafety';

/**
 * Onda 154 — simulação exaustiva do acionamento de I/O físico (etapa 8).
 *
 * O que estamos tentando quebrar: a promessa de que **nenhuma sequência de
 * comandos deixa uma saída travada em nível ativo sem que alguém tenha pedido
 * isso explicitamente**. Sirene presa ligada é o pior defeito deste subsistema
 * — pior que sirene que não toca, porque queima a confiança no alarme inteiro.
 *
 * O `modelDecide` abaixo é uma reimplementação INDEPENDENTE da mesma regra.
 * A simulação compara duas escritas do mesmo raciocínio; se elas divergirem,
 * uma das duas está errada e o gate falha antes de chegar a produção.
 */

type ModelDecision =
  | { allowed: false; reason: string; retryAfterMs?: number }
  | { allowed: true; kind: string; effectiveMs: number | null; nextAllowedAtMs: number };

function modelDecide(
  port: IoPortConfig | null,
  command: IoCommand,
  hasCapability: boolean,
  nowMs: number
): ModelDecision {
  if (!hasCapability) return { allowed: false, reason: 'missing_capability' };
  if (!port) return { allowed: false, reason: 'unknown_port' };
  if (port.direction !== 'output') return { allowed: false, reason: 'not_an_output' };
  if (!port.enabled) return { allowed: false, reason: 'port_disabled' };

  const interval = Math.max(ABSOLUTE_MIN_INTERVAL_MS, port.minIntervalMs);
  const since =
    port.lastActuatedAtMs === null || port.lastActuatedAtMs === undefined
      ? Infinity
      : nowMs - port.lastActuatedAtMs;

  if (command.kind === 'set_inactive') {
    return {
      allowed: true,
      kind: 'set_inactive',
      effectiveMs: null,
      nextAllowedAtMs: nowMs + interval,
    };
  }
  if (command.kind === 'set_active' && port.outputMode !== 'bistable') {
    return { allowed: false, reason: 'hold_not_supported' };
  }
  if (command.kind === 'set_active' && port.lastState === 'active') {
    return { allowed: false, reason: 'already_in_state' };
  }
  if (since < interval) {
    return {
      allowed: false,
      reason: 'too_soon',
      retryAfterMs: Math.max(0, Math.ceil(interval - since)),
    };
  }
  if (command.kind === 'set_active') {
    return {
      allowed: true,
      kind: 'set_active',
      effectiveMs: null,
      nextAllowedAtMs: nowMs + interval,
    };
  }
  const asked =
    command.durationMs === null || command.durationMs === undefined
      ? port.pulseMs
      : command.durationMs;
  const duration = Number.isFinite(asked) ? Math.trunc(asked as number) : Number.NaN;
  if (!Number.isFinite(duration) || duration < MIN_PULSE_MS)
    return { allowed: false, reason: 'duration_too_short' };
  if (duration > MAX_PULSE_MS) return { allowed: false, reason: 'duration_too_long' };
  return {
    allowed: true,
    kind: 'pulse',
    effectiveMs: duration,
    nextAllowedAtMs: nowMs + duration + interval,
  };
}

const same = (a: IoDecision, b: ModelDecision): boolean => {
  if (a.allowed !== b.allowed) return false;
  if (!a.allowed) {
    const m = b as { reason: string; retryAfterMs?: number };
    return a.reason === m.reason && (a.retryAfterMs ?? null) === (m.retryAfterMs ?? null);
  }
  const m = b as { kind: string; effectiveMs: number | null; nextAllowedAtMs: number };
  return (
    a.kind === m.kind &&
    (a.effectiveMs ?? null) === (m.effectiveMs ?? null) &&
    a.nextAllowedAtMs === m.nextAllowedAtMs
  );
};

const NOW = 1_800_000_000_000;
const DIRECTIONS = ['output', 'input'] as const;
const MODES = ['monostable', 'bistable'] as const;
const STATES = ['active', 'inactive', 'unknown'] as const;
const COMMANDS = ['pulse', 'set_active', 'set_inactive'] as const;
const GAPS = [null, 0, 1, 249, 250, 999, 1000, 5000];
const DURATIONS = [undefined, null, 0, 99, 100, 2000, 60000, 60001, Number.NaN, -5, 1.9];
const INTERVALS = [0, 250, 1000];

describe('Onda 154 — simulação de I/O de alarme físico', () => {
  it('matriz combinatória: implementação e modelo concordam em tudo', () => {
    const violations: string[] = [];
    let scenarios = 0;

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
                      const port: IoPortConfig = {
                        id: 'p',
                        direction,
                        enabled,
                        outputMode,
                        pulseMs: 2000,
                        minIntervalMs,
                        lastState,
                        lastActuatedAtMs: gap === null || gap === undefined ? null : NOW - gap,
                      };
                      const command: IoCommand = { kind, durationMs };
                      const real = decideActuation({ port, command, hasCapability, nowMs: NOW });
                      if (!same(real, modelDecide(port, command, hasCapability, NOW))) {
                        violations.push(
                          `divergência em ${direction}/${outputMode}/${kind}/${durationMs}`
                        );
                      }
                      if (real.allowed && real.kind === 'pulse') {
                        const ms = real.effectiveMs ?? -1;
                        if (ms < MIN_PULSE_MS || ms > MAX_PULSE_MS)
                          violations.push(`pulso fora dos limites: ${ms}`);
                      }
                      if (real.allowed && real.kind === 'set_active' && outputMode !== 'bistable') {
                        violations.push('travamento liberado em porta monoestável');
                      }
                      if (!hasCapability && real.allowed)
                        violations.push('acionamento sem capacidade');
                      if (direction === 'input' && real.allowed)
                        violations.push('entrada digital acionada');
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(scenarios).toBeGreaterThan(9000);
    expect(violations).toEqual([]);
  });

  it('trajetórias vivas: nenhuma saída monoestável termina travada', () => {
    const violations: string[] = [];
    let seed = 154;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

    for (let traj = 0; traj < 400; traj++) {
      const outputMode = pick(MODES);
      const port: IoPortConfig = {
        id: 'p',
        direction: 'output',
        enabled: true,
        outputMode,
        pulseMs: pick([100, 500, 2000, 30000]),
        minIntervalMs: pick([0, 250, 1000, 5000]),
        lastState: 'inactive',
        lastActuatedAtMs: null,
      };
      let clock = NOW;
      let lastAllowedAt = Number.NEGATIVE_INFINITY;

      for (let step = 0; step < 40; step++) {
        clock += Math.floor(rnd() * 4000);
        const command: IoCommand = { kind: pick(COMMANDS), durationMs: pick(DURATIONS) };
        const decision = decideActuation({ port, command, hasCapability: true, nowMs: clock });
        if (!same(decision, modelDecide(port, command, true, clock))) {
          violations.push(`trajetória ${traj} passo ${step}: divergência do modelo`);
        }
        if (!decision.allowed) continue;

        // Dois acionamentos que MEXEM na saída nunca ficam mais próximos que o
        // piso absoluto. Desligar é isento — é a saída de emergência.
        if (decision.kind !== 'set_inactive') {
          if (clock - lastAllowedAt < ABSOLUTE_MIN_INTERVAL_MS) {
            violations.push(`trajetória ${traj}: acionamentos a ${clock - lastAllowedAt} ms`);
          }
          lastAllowedAt = clock;
          port.lastActuatedAtMs = clock;
        }

        if (decision.kind === 'pulse') {
          clock += decision.effectiveMs ?? 0;
          port.lastState = 'inactive';
        } else {
          port.lastState = decision.kind === 'set_active' ? 'active' : 'inactive';
        }
      }

      if (port.lastState === 'active' && outputMode !== 'bistable') {
        violations.push(`trajetória ${traj}: saída monoestável terminou travada ativa`);
      }
    }

    expect(violations).toEqual([]);
  });
});
