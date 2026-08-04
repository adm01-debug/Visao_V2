import { describe, expect, it } from 'vitest';

import {
  applySourceReport,
  diagnoseRule,
  emptyEpisode,
  isWithinSchedule,
  normalizeSchedule,
  pendingExplanation,
  rearmOnConnect,
  type AlarmRule,
  type AlarmSchedule,
} from '@/lib/alarms/alarmAggregation';

const rule = (over: Partial<AlarmRule> = {}): AlarmRule => ({
  id: 'r1',
  enabled: true,
  sourceIds: ['a', 'b'],
  ...over,
});

const businessHours: AlarmSchedule = Array.from({ length: 7 }, () => [
  { startMin: 480, endMin: 1080 },
]);

describe('alarmAggregation — agenda', () => {
  it('trata agenda vazia como 24x7', () => {
    expect(isWithinSchedule(null, Date.UTC(2026, 0, 5, 3, 0))).toBe(true);
  });

  it('respeita início inclusivo e fim exclusivo', () => {
    expect(isWithinSchedule(businessHours, Date.UTC(2026, 0, 5, 8, 0))).toBe(true);
    expect(isWithinSchedule(businessHours, Date.UTC(2026, 0, 5, 18, 0))).toBe(false);
  });

  it('cobre janela que cruza a meia-noite', () => {
    const night: AlarmSchedule = [[{ startMin: 22 * 60, endMin: 6 * 60 }], [], [], [], [], [], []];
    expect(isWithinSchedule(night, Date.UTC(2026, 0, 4, 23, 0))).toBe(true);
    expect(isWithinSchedule(night, Date.UTC(2026, 0, 5, 5, 59))).toBe(true);
    expect(isWithinSchedule(night, Date.UTC(2026, 0, 5, 6, 0))).toBe(false);
  });

  it('aplica o teto de seis períodos por dia', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ startMin: i * 100, endMin: i * 100 + 30 }));
    expect(normalizeSchedule([many, [], [], [], [], [], []])[0]).toHaveLength(6);
  });
});

describe('alarmAggregation — consistência da regra', () => {
  it('mantém a regra operando quando só parte das origens some', () => {
    const diagnosis = diagnoseRule(rule({ sourceIds: ['a', 'b'], missingSourceIds: ['a'] }));
    expect(diagnosis.health).toBe('inconsistent');
    expect(diagnosis.effectiveSourceIds).toEqual(['b']);
  });

  it('marca como inoperante quando todas as origens somem', () => {
    expect(diagnoseRule(rule({ missingSourceIds: ['a', 'b'] })).health).toBe('inoperative');
  });
});

describe('alarmAggregation — episódio', () => {
  it('abre com qualquer origem e só fecha com todas normalizadas', () => {
    const r = rule();
    const opened = applySourceReport(r, emptyEpisode(), {
      sourceId: 'a',
      state: 'active',
      at: 100,
    });
    expect(opened.transition).toBe('opened');

    const partial = applySourceReport(r, opened.state, { sourceId: 'a', state: 'clear', at: 200 });
    expect(partial.transition).toBe('sustained');
    expect(partial.pendingSources).toEqual(['b']);
    expect(pendingExplanation(partial)).toContain('silêncio não encerra');

    const closed = applySourceReport(r, partial.state, { sourceId: 'b', state: 'clear', at: 300 });
    expect(closed.transition).toBe('closed');
    expect(closed.state.openedAt).toBeNull();
  });

  it('não abre fora da agenda, mas nunca cancela episódio em curso', () => {
    const r = rule({ sourceIds: ['a'], schedule: businessHours });
    const blocked = applySourceReport(r, emptyEpisode(), {
      sourceId: 'a',
      state: 'active',
      at: Date.UTC(2026, 0, 5, 23, 0),
    });
    expect(blocked.ignored).toBe('out_of_schedule');

    const opened = applySourceReport(r, emptyEpisode(), {
      sourceId: 'a',
      state: 'active',
      at: Date.UTC(2026, 0, 5, 10, 0),
    });
    const afterHours = applySourceReport(r, opened.state, {
      sourceId: 'a',
      state: 'active',
      at: Date.UTC(2026, 0, 5, 23, 0),
    });
    expect(afterHours.state.openedAt).toBe(opened.state.openedAt);
  });

  it('rearma quando a origem já chega em alarme e congela quando desabilitada', () => {
    const rearmed = rearmOnConnect(
      rule(),
      emptyEpisode(),
      [{ sourceId: 'a', state: 'active', at: 500 }],
      500
    );
    expect(rearmed.transition).toBe('rearmed');

    const frozen = applySourceReport(rule({ enabled: false }), rearmed.state, {
      sourceId: 'a',
      state: 'clear',
      at: 600,
    });
    expect(frozen.ignored).toBe('rule_disabled');
    expect(frozen.state.openedAt).toBe(500);
  });

  it('descarta reporte atrasado sem alterar o episódio', () => {
    const opened = applySourceReport(rule(), emptyEpisode(), {
      sourceId: 'a',
      state: 'active',
      at: 100,
    });
    const stale = applySourceReport(rule(), opened.state, {
      sourceId: 'a',
      state: 'clear',
      at: 50,
    });
    expect(stale.ignored).toBe('stale_report');
    expect(stale.state.openedAt).toBe(100);
  });
});
