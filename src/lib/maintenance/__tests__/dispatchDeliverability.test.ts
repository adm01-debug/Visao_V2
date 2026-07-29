import { describe, expect, it } from 'vitest';
import {
  assessDeliverability,
  DISPATCH_CADENCE_MINUTES,
  type DispatchRunRow,
} from '../dispatchDeliverability';

const NOW = Date.parse('2026-07-29T15:40:00.000Z');

function ago(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

function run(overrides: Partial<DispatchRunRow> = {}): DispatchRunRow {
  return {
    ran_at: ago(5),
    channels: ['telegram'],
    candidates: 0,
    planned: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    throttled: 0,
    outcome: 'idle',
    ...overrides,
  };
}

describe('assessDeliverability', () => {
  it('V1 — sem execução registrada nunca reporta saúde', () => {
    const verdict = assessDeliverability([], 3, NOW);
    expect(verdict.punctuality).toBe('unknown');
    expect(verdict.delivery).toBe('unknown');
    expect(verdict.health).toBe('unknown');
    expect(verdict.health).not.toBe('ok');
  });

  it('V2 — despachante sem canal com crítico aberto é crítico e nomeia os não avisados', () => {
    const verdict = assessDeliverability([run({ channels: [] })], 12, NOW);
    expect(verdict.delivery).toBe('muted');
    expect(verdict.health).toBe('critical');
    expect(verdict.unnotifiedCritical).toBe(12);
  });

  it('V2 — sem canal e sem crítico aberto ainda é aviso, nunca "ok"', () => {
    const verdict = assessDeliverability([run({ channels: [] })], 0, NOW);
    expect(verdict.delivery).toBe('muted');
    expect(verdict.health).toBe('warning');
  });

  it('V3 — planejar sem entregar é falha crítica, não sucesso', () => {
    const verdict = assessDeliverability(
      [run({ candidates: 4, planned: 4, skipped: 0, sent: 0, failed: 4 })],
      4,
      NOW,
    );
    expect(verdict.delivery).toBe('failing');
    expect(verdict.health).toBe('critical');
    expect(verdict.unnotifiedCritical).toBe(4);
  });

  it('V4 — tudo silenciado por condição é ociosidade saudável', () => {
    const verdict = assessDeliverability(
      [run({ candidates: 9, planned: 0, skipped: 9, throttled: 9 })],
      2,
      NOW,
    );
    expect(verdict.delivery).toBe('idle');
    expect(verdict.health).toBe('ok');
    expect(verdict.unnotifiedCritical).toBe(0);
  });

  it('V5/V6 — atraso e entrega são eixos separados e o pior governa', () => {
    const late = assessDeliverability(
      [run({ ran_at: ago(90), candidates: 1, planned: 1, sent: 1, failed: 0, skipped: 0 })],
      0,
      NOW,
    );
    expect(late.punctuality).toBe('late');
    expect(late.delivery).toBe('delivering');
    expect(late.health).toBe('warning');

    const stalled = assessDeliverability([run({ ran_at: ago(600) })], 0, NOW);
    expect(stalled.punctuality).toBe('stalled');
    expect(stalled.health).toBe('critical');
  });

  it('V7 — execução no futuro é descartada e a anterior legível vale', () => {
    const verdict = assessDeliverability(
      [run({ ran_at: new Date(NOW + 30 * 60_000).toISOString(), channels: [] }), run({ ran_at: ago(10) })],
      0,
      NOW,
    );
    expect(verdict.lastRunAt).toBe(ago(10));
    expect(verdict.delivery).toBe('idle');
    expect(verdict.reasons.some((r) => r.includes('futuro'))).toBe(true);
  });

  it('V8 — contabilidade que não fecha é declarada ilegível', () => {
    const verdict = assessDeliverability(
      [run({ candidates: 10, planned: 2, skipped: 3, sent: 2, failed: 0 })],
      0,
      NOW,
    );
    expect(verdict.delivery).toBe('unreadable');
    expect(verdict.health).toBe('unknown');
  });

  it('V10 — crítico aberto só é "não notificado" quando a entrega falhou ou calou', () => {
    const delivering = assessDeliverability(
      [run({ candidates: 1, planned: 1, skipped: 0, sent: 1, failed: 0 })],
      7,
      NOW,
    );
    expect(delivering.unnotifiedCritical).toBe(0);
  });

  it('fronteira de frescor: cadência + folga ainda é "em dia"', () => {
    const edge = assessDeliverability([run({ ran_at: ago(DISPATCH_CADENCE_MINUTES + 15) })], 0, NOW);
    expect(edge.punctuality).toBe('fresh');
    const past = assessDeliverability(
      [run({ ran_at: ago(DISPATCH_CADENCE_MINUTES + 15.5) })],
      0,
      NOW,
    );
    expect(past.punctuality).toBe('late');
  });

  it('entrega parcial degrada sem virar catástrofe', () => {
    const verdict = assessDeliverability(
      [run({ candidates: 5, planned: 5, skipped: 0, sent: 3, failed: 2 })],
      0,
      NOW,
    );
    expect(verdict.delivery).toBe('degraded');
    expect(verdict.health).toBe('warning');
  });
});
