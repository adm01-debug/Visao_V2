import { describe, expect, it } from 'vitest';

import {
  DEAF_EVIDENCE_REASONS,
  DEFAULT_RELAY_WINDOW_POLICY as P,
  classifyExpiry,
  countsAsDeafEvidence,
  normalizeWindow,
} from '../relayTaskWindow';

describe('normalizeWindow', () => {
  it('aplica a janela padrão a partir do agendamento quando não há TTL proposto', () => {
    const r = normalizeWindow({ scheduledInSeconds: 540, expiresInSeconds: null });
    expect(r.expiresInSeconds).toBe(540 + P.minWindowSeconds);
    expect(r.windowSeconds).toBe(P.minWindowSeconds);
    expect(r.adjusted).toBe(false);
  });

  it('estica o TTL curto de uma tarefa jitterada — a armadilha da Onda 118', () => {
    // Produtor legado: expira em 60s, mas a tarefa só fica elegível em 540s.
    const r = normalizeWindow({ scheduledInSeconds: 540, expiresInSeconds: 60 });
    expect(r.adjusted).toBe(true);
    expect(r.expiresInSeconds).toBeGreaterThan(r.scheduledInSeconds);
    expect(r.windowSeconds).toBe(P.minWindowSeconds);
  });

  it('trunca TTL absurdo no teto de sanidade', () => {
    const r = normalizeWindow({ scheduledInSeconds: 0, expiresInSeconds: 10 * 24 * 3600 });
    expect(r.adjusted).toBe(true);
    expect(r.windowSeconds).toBe(P.maxWindowSeconds);
  });

  it('preserva uma janela já saudável', () => {
    const r = normalizeWindow({ scheduledInSeconds: 30, expiresInSeconds: 30 + 300 });
    expect(r.adjusted).toBe(false);
    expect(r.windowSeconds).toBe(300);
  });

  it('trata agendamento negativo como imediato', () => {
    const r = normalizeWindow({ scheduledInSeconds: -50, expiresInSeconds: null });
    expect(r.scheduledInSeconds).toBe(0);
    expect(r.expiresInSeconds).toBe(P.minWindowSeconds);
  });

  it('nunca produz janela invertida ou fora dos limites, para qualquer proposta', () => {
    for (let scheduled = 0; scheduled <= 600; scheduled += 37) {
      for (const ttl of [null, -10, 0, 1, 59, 60, 600, 3599, 3601, 999999]) {
        const r = normalizeWindow({ scheduledInSeconds: scheduled, expiresInSeconds: ttl });
        expect(r.expiresInSeconds).toBeGreaterThan(r.scheduledInSeconds);
        expect(r.windowSeconds).toBeGreaterThanOrEqual(P.minWindowSeconds);
        expect(r.windowSeconds).toBeLessThanOrEqual(P.maxWindowSeconds);
        // Invariante central: toda janela normalizada é diagnosticável.
        expect(countsAsDeafEvidence(r.windowSeconds)).toBe(true);
      }
    }
  });
});

describe('classifyExpiry', () => {
  it('culpa o produtor, não o agente, quando a janela foi injusta', () => {
    expect(classifyExpiry({ windowSeconds: 10, claimed: false })).toBe(
      'task_expired_unfair_window'
    );
    expect(classifyExpiry({ windowSeconds: 10, claimed: true })).toBe('task_expired_unfair_window');
  });

  it('distingue agente surdo de agente travado', () => {
    expect(classifyExpiry({ windowSeconds: 300, claimed: false })).toBe('task_expired_unclaimed');
    expect(classifyExpiry({ windowSeconds: 300, claimed: true })).toBe('task_expired_no_response');
  });

  it('trata a janela justa como limite inclusivo', () => {
    expect(countsAsDeafEvidence(P.fairWindowSeconds)).toBe(true);
    expect(countsAsDeafEvidence(P.fairWindowSeconds - 1)).toBe(false);
  });

  it('só motivos de janela justa alimentam a razão de surdez', () => {
    expect(DEAF_EVIDENCE_REASONS).not.toContain('task_expired_unfair_window');
    expect(DEAF_EVIDENCE_REASONS).toHaveLength(2);
  });
});
