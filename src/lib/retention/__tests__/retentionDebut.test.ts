import { describe, expect, it } from 'vitest';
import {
  evaluateRetentionDebut,
  formatDebutCountdown,
} from '../retentionDebut';

const NOW = Date.parse('2026-07-29T18:00:00.000Z');
const MIN = 60_000;

describe('evaluateRetentionDebut (Onda 245)', () => {
  it('U3: execução presente anula a estreia', () => {
    const view = evaluateRetentionDebut(
      {
        cadenceMinutes: 1440,
        lastRun: new Date(NOW - 10 * MIN).toISOString(),
        registeredAt: new Date(NOW - 5 * MIN).toISOString(),
      },
      NOW,
    );
    expect(view.stage).toBe('not_applicable');
    expect(view.health).toBe('ok');
  });

  it('U4: ausência de âncora mantém o crítico', () => {
    const view = evaluateRetentionDebut(
      { cadenceMinutes: 1440, lastRun: null, registeredAt: null },
      NOW,
    );
    expect(view.stage).toBe('no_anchor');
    expect(view.health).toBe('never');
    expect(view.dueAt).toBeNull();
  });

  it('U5: registro no futuro não compra carência', () => {
    const view = evaluateRetentionDebut(
      { cadenceMinutes: 1440, lastRun: null, registeredAt: new Date(NOW + MIN).toISOString() },
      NOW,
    );
    expect(view.stage).toBe('no_anchor');
    expect(view.health).toBe('never');
    expect(view.dueAt).not.toBeNull();
  });

  it('U6: a fronteira do vencimento é fechada à esquerda', () => {
    const base = { cadenceMinutes: 60, lastRun: null } as const;
    const justInside = evaluateRetentionDebut(
      { ...base, registeredAt: new Date(NOW - 74.9 * MIN).toISOString() },
      NOW,
    );
    const exact = evaluateRetentionDebut(
      { ...base, registeredAt: new Date(NOW - 75 * MIN).toISOString() },
      NOW,
    );
    expect(justInside.stage).toBe('pending');
    expect(exact.stage).toBe('overdue');
    expect(exact.health).toBe('never');
  });

  it('U10: contagem regressiva nunca mostra zero enquanto falta tempo', () => {
    const view = evaluateRetentionDebut(
      { cadenceMinutes: 60, lastRun: null, registeredAt: new Date(NOW - 74.99 * MIN).toISOString() },
      NOW,
    );
    expect(view.minutesRemaining).toBe(1);
    expect(formatDebutCountdown(view)).toBe('estreia em 1 min');
  });

  it('U9: divergência com a saúde do banco é declarada', () => {
    const view = evaluateRetentionDebut(
      {
        cadenceMinutes: 1440,
        lastRun: null,
        registeredAt: new Date(NOW - MIN).toISOString(),
        reportedHealth: 'never',
      },
      NOW,
    );
    expect(view.health).toBe('pending_first_run');
    expect(view.mismatch).toBe(true);
  });

  it('U1/U2: relógio ou cadência ilegíveis não afirmam nada', () => {
    expect(
      evaluateRetentionDebut(
        { cadenceMinutes: 0, lastRun: null, registeredAt: new Date(NOW).toISOString() },
        NOW,
      ).stage,
    ).toBe('unknown');
    expect(
      evaluateRetentionDebut(
        { cadenceMinutes: 1440, lastRun: null, registeredAt: new Date(NOW).toISOString() },
        Number.NaN,
      ).stage,
    ).toBe('unknown');
  });

  it('U8: o vencimento não se move com o relógio de leitura', () => {
    const row = {
      cadenceMinutes: 1440,
      lastRun: null,
      registeredAt: '2026-07-29T15:15:00.000Z',
    };
    expect(evaluateRetentionDebut(row, NOW).dueAt).toBe(
      evaluateRetentionDebut(row, NOW + 90 * MIN).dueAt,
    );
  });
});
