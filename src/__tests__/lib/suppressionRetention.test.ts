/**
 * Onda 243 — leis T1–T9 da guarda de retenção da trilha de supressão.
 */
import { describe, expect, it } from 'vitest';
import {
  planSuppressionPurge,
  suppressionPlanIsBalanced,
  SUPPRESSION_RETENTION_DAYS_DEFAULT,
  type SuppressionCandidate,
} from '@/lib/maintenance/suppressionRetention';

const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const DAY = 86_400_000;

function row(over: Partial<SuppressionCandidate> & { id: string | number }): SuppressionCandidate {
  return {
    suppressedAt: NOW - DAY,
    conditionKey: 'admission_trend:ledger_stock',
    channel: 'telegram',
    windowMinutes: 1440,
    ...over,
  };
}

const plan = (rows: SuppressionCandidate[], over: Partial<Parameters<typeof planSuppressionPurge>[1]> = {}) =>
  planSuppressionPurge(rows, { now: NOW, retentionDays: 90, batchCap: 100, anchorPerCondition: 3, ...over });

describe('Onda 243 — retenção da trilha de supressão', () => {
  it('T1 relógio ilegível recusa o expurgo inteiro', () => {
    const p = planSuppressionPurge([row({ id: 1 })], { now: Number.NaN });
    expect(p.ok).toBe(false);
    expect(p.refusal).toBe('bad_now');
    expect(p.deleted).toBe(0);
  });

  it('T2 prazo fora da faixa recusa em vez de "corrigir"', () => {
    expect(plan([row({ id: 1 })], { retentionDays: 29 }).refusal).toBe('bad_retention_days');
    expect(plan([row({ id: 1 })], { retentionDays: 731 }).refusal).toBe('bad_retention_days');
    expect(plan([row({ id: 1 })], { retentionDays: 90.5 }).refusal).toBe('bad_retention_days');
    expect(SUPPRESSION_RETENTION_DAYS_DEFAULT).toBe(90);
  });

  it('T3 empate exato no corte preserva a linha', () => {
    const p = plan([
      row({ id: 'corte', suppressedAt: NOW - 90 * DAY }),
      row({ id: 'vencida', suppressedAt: NOW - 90 * DAY - 1 }),
    ], { anchorPerCondition: 1 });
    // a mais recente (corte) é a âncora e fica; a vencida sai.
    expect(p.deleteIds).toEqual(['vencida']);
  });

  it('T4 âncora por condição impede que "starved" vire "sem histórico"', () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => row({ id: `a${i}`, conditionKey: 'a', suppressedAt: NOW - (200 + i) * DAY })),
      ...Array.from({ length: 6 }, (_, i) => row({ id: `b${i}`, conditionKey: 'b', suppressedAt: NOW - (300 + i) * DAY })),
    ];
    const p = plan(rows, { anchorPerCondition: 2 });
    expect(p.anchored).toBe(4);
    expect(p.deleted).toBe(8);
    // sobrevive pelo menos uma linha de cada condição
    expect(p.deleteIds).not.toContain('a0');
    expect(p.deleteIds).not.toContain('b0');
  });

  it('T5 linha ilegível vai para quarentena, nunca para o lixo', () => {
    const p = plan([
      row({ id: 1, conditionKey: '  ' }),
      row({ id: 2, channel: 'sms' }),
      row({ id: 3, windowMinutes: 0 }),
      row({ id: 4, suppressedAt: 'ontem' }),
      row({ id: 5, windowMinutes: 50_000 }),
    ]);
    expect(p.quarantined).toBe(5);
    expect(p.deleted).toBe(0);
  });

  it('T6 teto de lote apaga as mais antigas e declara o adiamento', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: `r${i}`, suppressedAt: NOW - (400 - i) * DAY }),
    );
    const p = plan(rows, { batchCap: 3, anchorPerCondition: 1 });
    expect(p.deleted).toBe(3);
    expect(p.capped).toBe(true);
    expect(p.deferred).toBe(6);
    expect(p.deleteIds).toEqual(['r0', 'r1', 'r2']);
    expect(plan(rows, { batchCap: 0 }).refusal).toBe('bad_batch_cap');
  });

  it('T7 a contabilidade sempre fecha', () => {
    const rows = [
      ...Array.from({ length: 9 }, (_, i) => row({ id: `x${i}`, suppressedAt: NOW - (200 + i) * DAY })),
      row({ id: 'novo' }),
      row({ id: 'ruim', channel: 'push' }),
    ];
    const p = plan(rows, { batchCap: 4, anchorPerCondition: 2 });
    expect(suppressionPlanIsBalanced(p)).toBe(true);
    expect(p.examined).toBe(11);
  });

  it('T8 a ordem de entrada nunca altera o resultado', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({ id: `r${i}`, conditionKey: i % 2 === 0 ? 'a' : 'b', suppressedAt: NOW - (150 + i) * DAY }),
    );
    const direct = plan(rows, { batchCap: 5, anchorPerCondition: 2 });
    const reversed = plan([...rows].reverse(), { batchCap: 5, anchorPerCondition: 2 });
    expect(reversed.deleteIds).toEqual(direct.deleteIds);
    expect(reversed.anchored).toBe(direct.anchored);
  });

  it('T9 relógio no futuro nunca autoriza remoção', () => {
    const p = plan([row({ id: 'futuro', suppressedAt: NOW + DAY })]);
    expect(p.quarantined).toBe(1);
    expect(p.deleted).toBe(0);
  });
});
