import { describe, expect, it } from 'vitest';
import { assessOrphanTrendFromRows } from '../admissionOrphanTrend';
import {
  ADMISSION_TREND_PREFIX,
  admissionTrendRoutineKey,
  buildTrendAlert,
  trendAlertSeverity,
  trendCooldownMinutes,
} from '../admissionTrendAlert';

const BASE = Date.parse('2026-07-01T03:55:00.000Z');
const rows = (series: number[]) =>
  series.map((orphan, i) => ({
    id: i + 1,
    observed_at: new Date(BASE + i * 86_400_000).toISOString(),
    verdict: orphan > 0 ? 'unaccounted' : 'reconciled',
    orphan_count: String(orphan),
    expired_stock: String(orphan + 1),
    declared_deferred: '0',
    drift_stock: '0',
  }));

describe('admissionTrendAlert (Onda 236)', () => {
  it('M2/M3 — crescente e persistente são críticos, com cooldowns distintos', () => {
    expect(trendAlertSeverity('growing')).toBe('critical');
    expect(trendAlertSeverity('persistent')).toBe('critical');
    expect(trendCooldownMinutes(1440, 'growing')).toBe(720);
    expect(trendCooldownMinutes(1440, 'persistent')).toBe(1440);
  });

  it('M4 — órfão em queda ou recém-surgido avisa, nunca silencia', () => {
    expect(trendAlertSeverity('resolving')).toBe('warning');
    expect(trendAlertSeverity('emerging')).toBe('warning');
    expect(buildTrendAlert(assessOrphanTrendFromRows(rows([5, 3, 1])))?.severity).toBe('warning');
  });

  it('M5 — sem órfão e sem histórico não emitem', () => {
    expect(buildTrendAlert(assessOrphanTrendFromRows(rows([3, 2, 0])))).toBeNull();
    expect(buildTrendAlert(assessOrphanTrendFromRows([]))).toBeNull();
  });

  it('M6 — histórico apenas ilegível nunca acusa tendência', () => {
    const a = assessOrphanTrendFromRows([{ id: 1, orphan_count: null }, { id: 2 }]);
    expect(a.readable).toBe(0);
    expect(buildTrendAlert(a)).toBeNull();
  });

  it('M7 — chave própria, sem colidir com os fan-ins vizinhos', () => {
    const key = admissionTrendRoutineKey();
    expect(key.startsWith(ADMISSION_TREND_PREFIX)).toBe(true);
    expect(key.startsWith('admission_reconcile:')).toBe(false);
    expect(key.startsWith('admission_backlog:')).toBe(false);
  });

  it('M8 — a frase e o detalhe carregam a série que sustenta a acusação', () => {
    const alert = buildTrendAlert(assessOrphanTrendFromRows(rows([1, 2, 3])));
    expect(alert?.reason).toContain('1 → 2 → 3');
    expect(alert?.reason).toContain('cadência 1440 min');
    expect(alert?.detail.series).toEqual([1, 2, 3]);
    expect(alert?.detail.readable).toBe(3);
    expect(alert?.observedAt).not.toBeNull();
  });

  it('M1 — cadência inválida falha alto em vez de silenciar o canal', () => {
    expect(() => trendCooldownMinutes(0, 'growing')).toThrow(RangeError);
    expect(() => trendCooldownMinutes(Number.NaN, 'persistent')).toThrow(RangeError);
  });

  it('cooldown respeita piso e teto', () => {
    expect(trendCooldownMinutes(1, 'growing')).toBe(60);
    expect(trendCooldownMinutes(100000, 'persistent')).toBe(1440);
  });
});
