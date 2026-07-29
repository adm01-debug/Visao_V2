/**
 * Onda 242 — leis S1–S10 da trilha do ruído evitado.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSuppressionLedger,
  classifyPerDay,
  severityForLedger,
  SUPPRESSION_ROW_CAP,
  type DeliveryRow,
  type SuppressionRow,
} from '@/lib/maintenance/suppressionLedger';

const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const H = 3_600_000;

function row(over: Partial<SuppressionRow> = {}): SuppressionRow {
  return {
    conditionKey: 'admission_trend:ledger_stock',
    channel: 'telegram',
    severity: 'critical',
    windowMinutes: 1440,
    suppressedAt: new Date(NOW - H).toISOString(),
    ...over,
  };
}

function delivery(over: Partial<DeliveryRow> = {}): DeliveryRow {
  return {
    conditionKey: 'admission_trend:ledger_stock',
    channel: 'telegram',
    sentAt: new Date(NOW - 2 * H).toISOString(),
    ...over,
  };
}

const build = (
  rows: SuppressionRow[],
  deliveries: DeliveryRow[] = [delivery()],
  windowHours = 168,
) => buildSuppressionLedger(rows, deliveries, NOW, windowHours);

describe('Onda 242 — trilha do ruído evitado', () => {
  it('S1 agrega por condição preservando canais e instantes', () => {
    const ledger = build([row(), row({ channel: 'email' })]);
    expect(ledger.conditions).toHaveLength(1);
    expect(ledger.conditions[0].suppressed).toBe(2);
    expect(ledger.conditions[0].channels).toEqual(['email', 'telegram']);
  });

  it('S2 linha ilegível nunca vira economia', () => {
    const ledger = build([
      row({ conditionKey: '   ' }),
      row({ conditionKey: null }),
      row({ channel: 'sms' }),
      row({ suppressedAt: 'ontem' }),
      row({ windowMinutes: -5 }),
    ]);
    expect(ledger.suppressed).toBe(0);
    expect(ledger.unreadable).toBe(5);
    expect(ledger.verdict).toBe('no_history');
  });

  it('S3 supressão fora da janela é descartada', () => {
    const ledger = build([row({ suppressedAt: new Date(NOW - 200 * H).toISOString() })]);
    expect(ledger.outOfWindow).toBe(1);
    expect(ledger.suppressed).toBe(0);
  });

  it('S4 relógio no futuro é ilegível, não economia', () => {
    const ledger = build([row({ suppressedAt: new Date(NOW + H).toISOString() })]);
    expect(ledger.unreadable).toBe(1);
    expect(ledger.suppressed).toBe(0);
  });

  it('S5 sem histórico nunca é "calmo"', () => {
    const ledger = build([], []);
    expect(ledger.verdict).toBe('no_history');
    expect(severityForLedger(ledger.verdict)).toBe('ok');
  });

  it('S6 condição calada sem nenhuma entrega é o pior veredito', () => {
    const ledger = build([row()], []);
    expect(ledger.verdict).toBe('starved');
    expect(ledger.starved).toEqual(['admission_trend:ledger_stock']);
    expect(severityForLedger(ledger.verdict)).toBe('critical');
  });

  it('S7 a pior condição governa, nunca a média', () => {
    const ledger = build(
      [row(), row({ conditionKey: 'admission_reconcile:x' })],
      [delivery()], // só a primeira condição notificou
    );
    expect(ledger.verdict).toBe('starved');
  });

  it('S8 o volume é taxa diária, não total absoluto', () => {
    const many = Array.from({ length: 20 }, () => row());
    expect(build(many, [delivery()], 168).conditions[0].verdict).toBe('moderate');
    expect(build(many, [delivery()], 24).conditions[0].verdict).toBe('heavy');
    expect(classifyPerDay(0.4)).toBe('light');
    expect(classifyPerDay(5.1)).toBe('heavy');
  });

  it('S9 saturação do teto é visível', () => {
    const rows = Array.from({ length: SUPPRESSION_ROW_CAP + 10 }, () => row());
    const ledger = build(rows);
    expect(ledger.saturated).toBe(true);
    expect(ledger.suppressed).toBe(SUPPRESSION_ROW_CAP);
  });

  it('S10 a ordem das condições é estável e determinística', () => {
    const ledger = build(
      [
        row({ conditionKey: 'b' }),
        row({ conditionKey: 'a' }),
        row({ conditionKey: 'a' }),
        row({ conditionKey: 'c' }),
      ],
      [delivery({ conditionKey: 'a' }), delivery({ conditionKey: 'b' }), delivery({ conditionKey: 'c' })],
    );
    expect(ledger.conditions.map((c) => c.conditionKey)).toEqual(['a', 'b', 'c']);
  });

  it('janela inválida devolve retrato vazio em vez de extrapolar', () => {
    expect(buildSuppressionLedger([row()], [], NOW, 0).verdict).toBe('no_history');
    expect(buildSuppressionLedger([row()], [], Number.NaN, 24).suppressed).toBe(0);
  });
});
