import { describe, expect, it } from 'vitest';
import {
  assessOrphanTrendFromRows,
  classifyOrphanSeries,
  readReconcileSnapshot,
  renderTrendReason,
  severityForTrend,
} from '../admissionOrphanTrend';

const BASE = Date.parse('2026-07-01T03:51:00.000Z');
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

describe('admissionOrphanTrend', () => {
  it('L2 — a foto mais recente zerada encerra a acusação', () => {
    expect(classifyOrphanSeries([9, 8, 7, 0])).toBe('clear');
    expect(severityForTrend('clear')).toBeNull();
  });

  it('L3 — histórico curto é emergente, nunca persistente', () => {
    expect(classifyOrphanSeries([5])).toBe('emerging');
    expect(classifyOrphanSeries([0, 4, 5])).toBe('emerging');
  });

  it('L4/L5/L6 — crescimento, queda e estabilidade são vereditos distintos', () => {
    expect(classifyOrphanSeries([1, 2, 3])).toBe('growing');
    expect(classifyOrphanSeries([5, 3, 1])).toBe('resolving');
    expect(classifyOrphanSeries([4, 4, 4])).toBe('persistent');
    expect(classifyOrphanSeries([2, 5, 3])).toBe('persistent');
  });

  it('L5 — órfão em queda ainda emite aviso', () => {
    expect(severityForTrend('resolving')).toBe('warning');
    expect(severityForTrend('growing')).toBe('critical');
  });

  it('L1 — linha ilegível não vira zero nem entra na série', () => {
    const r = readReconcileSnapshot({ id: 1, observed_at: 'xx', orphan_count: '2' }, 0);
    expect(r.status).toBe('unreadable');
    const a = assessOrphanTrendFromRows([...rows([3, 4, 5]), { id: 99, orphan_count: null }]);
    expect(a.trend).toEqual([3, 4, 5]);
    expect(a.unreadable).toBe(1);
    expect(a.verdict).toBe('growing');
  });

  it('L7 — a ordem de chegada não altera o veredito', () => {
    const canonical = assessOrphanTrendFromRows(rows([1, 2, 3])).verdict;
    expect(assessOrphanTrendFromRows(rows([1, 2, 3]).reverse()).verdict).toBe(canonical);
  });

  it('L8 — a frase carrega a série que sustenta o veredito', () => {
    const a = assessOrphanTrendFromRows(rows([1, 2, 3]));
    expect(renderTrendReason(a)).toContain('1 → 2 → 3');
  });

  it('histórico vazio é ausência de informação, não saúde', () => {
    const a = assessOrphanTrendFromRows([]);
    expect(a.verdict).toBe('no_history');
    expect(severityForTrend(a.verdict)).toBeNull();
    expect(renderTrendReason(a)).toContain('Sem histórico');
  });
});
