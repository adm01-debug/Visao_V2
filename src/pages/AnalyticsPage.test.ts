/**
 * Regressão — Agrupamento diário por fuso local em AnalyticsPage.
 *
 * O bug original usava `.startsWith(dayStr)` sobre o timestamp ISO UTC,
 * atribuindo eventos próximos à meia-noite ao dia errado em fusos negativos
 * (ex.: UTC-03:00). `sameLocalDay` converte para o fuso local antes de comparar.
 *
 * Estes testes são independentes do fuso do runner: comparam a saída de
 * `sameLocalDay` com a conversão local feita via `date-fns` diretamente,
 * garantindo que o agrupamento acompanha o fuso local em qualquer ambiente.
 */
import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { sameLocalDay } from '@/lib/dateGrouping';

const localDayOf = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

describe('sameLocalDay (agrupamento por fuso local)', () => {
  it('corresponde à conversão local de date-fns para um evento do dia', () => {
    const iso = '2026-11-22T10:00:00.000Z';
    expect(sameLocalDay(iso, localDayOf(iso))).toBe(true);
  });

  it('rejeita um dia que difere da conversão local', () => {
    const iso = '2026-11-22T10:00:00.000Z';
    const wrong = localDayOf(iso) === '2026-11-22' ? '2026-11-23' : '2026-11-22';
    expect(sameLocalDay(iso, wrong)).toBe(false);
  });

  it('move evento na véspera de meia-noite para o dia local correto', () => {
    // 2026-11-23 02:00 UTC: cai no dia 22 local se o fuso for negativo (UTC-3),
    // no dia 23 se for UTC/positivo. A asserção segue o fuso real do runner.
    const iso = '2026-11-23T02:00:00.000Z';
    expect(sameLocalDay(iso, localDayOf(iso))).toBe(true);
  });

  it('retorna false para timestamp nulo/ausente', () => {
    const day = '2026-11-22';
    expect(sameLocalDay(null, day)).toBe(false);
    expect(sameLocalDay(undefined, day)).toBe(false);
    expect(sameLocalDay('', day)).toBe(false);
  });
});
