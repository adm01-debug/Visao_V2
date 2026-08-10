import { describe, it, expect } from 'vitest';
import {
  pushHistory,
  limitsEqual,
  formatHistorySummary,
  type LimitsHistoryItem,
} from '../lib/limitsHistory';
import type { PtzLimits } from '../PtzCalibrationPanel';

const L = (a: number, b: number): PtzLimits => ({
  pan: { min: a, max: b },
  tilt: { min: a, max: b },
  zoom: { min: 0, max: 1 },
});

const item = (saved_at: string, l = L(-1, 1)): LimitsHistoryItem => ({
  limits: l,
  saved_at,
  source: 'wizard',
});

describe('pushHistory', () => {
  it('faz prepend do item mais recente', () => {
    const r = pushHistory([item('2026-01-01')], item('2026-02-01'));
    expect(r[0].saved_at).toBe('2026-02-01');
    expect(r[1].saved_at).toBe('2026-01-01');
  });

  it('corta em cap=10', () => {
    const base = Array.from({ length: 12 }, (_, i) =>
      item(`2026-01-${String(i + 1).padStart(2, '0')}`)
    );
    const r = pushHistory(base, item('2026-02-15'));
    expect(r).toHaveLength(10);
    expect(r[0].saved_at).toBe('2026-02-15');
  });

  it('ignora duplicata consecutiva (mesmo saved_at)', () => {
    const prev = [item('2026-01-01')];
    const r = pushHistory(prev, item('2026-01-01'));
    expect(r).toBe(prev);
  });
});

describe('limitsEqual', () => {
  it('detecta igualdade estrutural', () => {
    expect(limitsEqual(L(-1, 1), L(-1, 1))).toBe(true);
    expect(limitsEqual(L(-1, 1), L(-0.9, 1))).toBe(false);
  });
});

describe('formatHistorySummary', () => {
  it('formata compactamente com 2 casas', () => {
    const s = formatHistorySummary(item('x', L(-0.8, 0.9)));
    expect(s).toContain('pan -0.80→0.90');
    expect(s).toContain('zoom 0.00→1.00');
  });
});
