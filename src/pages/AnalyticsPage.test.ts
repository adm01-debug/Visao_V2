/**
 * Regressão — Agrupamento diário por fuso local em AnalyticsPage.
 *
 * O bug original usava `.startsWith(dayStr)` sobre o timestamp ISO UTC,
 * atribuindo eventos próximos à meia-noite ao dia errado em fusos negativos
 * (ex.: UTC-03:00). `sameLocalDay` converte para o fuso local antes de comparar.
 *
 * Estratégia independente do fuso do runner: cada asserção compara `sameLocalDay`
 * com a conversão local de referência `format(new Date(iso), 'yyyy-MM-dd')`,
 * a mesma usada no código. Assim o teste passa em UTC e em UTC-3, e detectaria
 * qualquer divergência entre `sameLocalDay` e a conversão local real.
 */
import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { sameLocalDay } from '@/lib/dateGrouping';

const localDayOf = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

describe('sameLocalDay (agrupamento por fuso local)', () => {
  it('corresponde à conversão local de date-fns (mesmo dia)', () => {
    const iso = '2026-11-22T10:00:00.000Z';
    expect(sameLocalDay(iso, localDayOf(iso))).toBe(true);
  });

  it('corresponde à conversão local na véspera de meia-noite UTC', () => {
    // Se o fuso for negativo (UTC-3), este instante pertence ao dia anterior;
    // a conversão local de referência captura isso, e sameLocalDay deve segui-la.
    const iso = '2026-11-23T02:00:00.000Z';
    expect(sameLocalDay(iso, localDayOf(iso))).toBe(true);
  });

  it('rejeita um dia que difere da conversão local', () => {
    const iso = '2026-11-22T10:00:00.000Z';
    const wrongDay = localDayOf(iso) === '2026-11-22' ? '2026-11-23' : '2026-11-22';
    expect(sameLocalDay(iso, wrongDay)).toBe(false);
  });

  it('retorna false para timestamp nulo/ausente', () => {
    const day = '2026-11-22';
    expect(sameLocalDay(null, day)).toBe(false);
    expect(sameLocalDay(undefined, day)).toBe(false);
    expect(sameLocalDay('', day)).toBe(false);
  });
});
