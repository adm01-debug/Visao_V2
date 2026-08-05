import { describe, expect, it } from 'vitest';
import {
  ABSOLUTE_MIN_INTERVAL_MS,
  MAX_PULSE_MS,
  MIN_PULSE_MS,
  decideActuation,
  type IoPortConfig,
} from '../ioSafety';

const port = (over: Partial<IoPortConfig> = {}): IoPortConfig => ({
  id: 'p1',
  direction: 'output',
  enabled: true,
  outputMode: 'monostable',
  pulseMs: 2000,
  minIntervalMs: 1000,
  lastState: 'inactive',
  lastActuatedAtMs: null,
  ...over,
});

const NOW = 1_800_000_000_000;

describe('ioSafety.decideActuation', () => {
  it('recusa antes de tudo quando falta a capacidade', () => {
    // Ordem importa: sem permissão nem chegamos a avaliar a porta.
    const d = decideActuation({
      port: null,
      command: { kind: 'pulse' },
      hasCapability: false,
      nowMs: NOW,
    });
    expect(d).toMatchObject({ allowed: false, reason: 'missing_capability' });
  });

  it('recusa porta inexistente, desabilitada e entrada', () => {
    expect(
      decideActuation({ port: null, command: { kind: 'pulse' }, hasCapability: true, nowMs: NOW })
    ).toMatchObject({ reason: 'unknown_port' });
    expect(
      decideActuation({
        port: port({ enabled: false }),
        command: { kind: 'pulse' },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ reason: 'port_disabled' });
    expect(
      decideActuation({
        port: port({ direction: 'input' }),
        command: { kind: 'pulse' },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ reason: 'not_an_output' });
  });

  it('usa a duração padrão da porta quando nenhuma é pedida', () => {
    const d = decideActuation({
      port: port(),
      command: { kind: 'pulse' },
      hasCapability: true,
      nowMs: NOW,
    });
    expect(d).toMatchObject({ allowed: true, effectiveMs: 2000 });
  });

  it('rejeita durações fora dos limites de segurança', () => {
    expect(
      decideActuation({
        port: port(),
        command: { kind: 'pulse', durationMs: MIN_PULSE_MS - 1 },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ reason: 'duration_too_short' });
    expect(
      decideActuation({
        port: port(),
        command: { kind: 'pulse', durationMs: MAX_PULSE_MS + 1 },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ reason: 'duration_too_long' });
  });

  it('respeita o intervalo mínimo e informa quanto falta', () => {
    const p = port({ lastActuatedAtMs: NOW - 400 });
    const d = decideActuation({
      port: p,
      command: { kind: 'pulse' },
      hasCapability: true,
      nowMs: NOW,
    });
    expect(d).toMatchObject({ allowed: false, reason: 'too_soon', retryAfterMs: 600 });
  });

  it('nunca deixa o intervalo cair abaixo do piso absoluto', () => {
    const p = port({ minIntervalMs: 0, lastActuatedAtMs: NOW - 10 });
    const d = decideActuation({
      port: p,
      command: { kind: 'pulse' },
      hasCapability: true,
      nowMs: NOW,
    });
    expect(d).toMatchObject({ allowed: false, reason: 'too_soon' });
    expect((d as { retryAfterMs: number }).retryAfterMs).toBeLessThanOrEqual(
      ABSOLUTE_MIN_INTERVAL_MS
    );
  });

  it('só permite travar ligada em saída biestável', () => {
    expect(
      decideActuation({
        port: port(),
        command: { kind: 'set_active' },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ reason: 'hold_not_supported' });
    expect(
      decideActuation({
        port: port({ outputMode: 'bistable' }),
        command: { kind: 'set_active' },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ allowed: true, kind: 'set_active' });
  });

  it('recusa travar o que já está travado', () => {
    const p = port({ outputMode: 'bistable', lastState: 'active' });
    expect(
      decideActuation({ port: p, command: { kind: 'set_active' }, hasCapability: true, nowMs: NOW })
    ).toMatchObject({ reason: 'already_in_state' });
  });

  it('deixa desligar SEMPRE passar, mesmo dentro do intervalo mínimo', () => {
    // Esta é a invariante mais importante do módulo: soltar um relé é a saída
    // de emergência. Bloquear "desligar" por cooldown deixaria sirene presa.
    const p = port({ outputMode: 'bistable', lastState: 'active', lastActuatedAtMs: NOW });
    expect(
      decideActuation({
        port: p,
        command: { kind: 'set_inactive' },
        hasCapability: true,
        nowMs: NOW,
      })
    ).toMatchObject({ allowed: true, kind: 'set_inactive' });
  });

  it('o próximo acionamento permitido cobre o pulso inteiro mais o intervalo', () => {
    const d = decideActuation({
      port: port(),
      command: { kind: 'pulse', durationMs: 5000 },
      hasCapability: true,
      nowMs: NOW,
    });
    expect(d).toMatchObject({ allowed: true, nextAllowedAtMs: NOW + 5000 + 1000 });
  });
});
