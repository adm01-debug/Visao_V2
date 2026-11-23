/**
 * Regressão — Agrupamento diário por fuso local em AnalyticsPage.
 *
 * O bug original usava `.startsWith(dayStr)` sobre o timestamp ISO UTC,
 * atribuindo eventos próximos à meia-noite ao dia errado em fusos negativos
 * (ex.: UTC-03:00). `sameLocalDay` converte para o fuso local antes de comparar.
 */
import { describe, it, expect } from 'vitest';
import { sameLocalDay } from '@/lib/dateGrouping';

describe('sameLocalDay (agrupamento por fuso local)', () => {
  const day = '2026-11-22';

  it('aceita evento no mesmo dia local', () => {
    // 2026-11-22 10:00:00 UTC = 07:00 local (UTC-3) — mesmo dia
    expect(sameLocalDay('2026-11-22T10:00:00.000Z', day)).toBe(true);
  });

  it('move evento UTC de meia-noite para o dia local anterior (UTC-3)', () => {
    // 2026-11-23 02:00:00 UTC = 2026-11-22 23:00 local (UTC-3) — dia anterior
    expect(sameLocalDay('2026-11-23T02:00:00.000Z', day)).toBe(true);
  });

  it('rejeita evento de outro dia local', () => {
    expect(sameLocalDay('2026-11-24T12:00:00.000Z', day)).toBe(false);
  });

  it('retorna false para timestamp nulo/ausente', () => {
    expect(sameLocalDay(null, day)).toBe(false);
    expect(sameLocalDay(undefined, day)).toBe(false);
    expect(sameLocalDay('', day)).toBe(false);
  });
});
