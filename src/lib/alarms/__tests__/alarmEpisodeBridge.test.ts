import { describe, it, expect } from 'vitest';
import { applySourceReport, emptyEpisode, rearmOnConnect, type AlarmRule } from '../alarmAggregation';
import { emptyRecurrenceLedger } from '../alarmRecurrence';
import { bridgeAggregation, reconcileLedger } from '../alarmEpisodeBridge';

const rule: AlarmRule = {
  id: 'r1',
  enabled: true,
  sourceIds: ['a', 'b'],
  schedule: null,
};

const input = { seriesKey: 'r1:a', severity: 'high' as const };
const T = Date.UTC(2026, 6, 28, 10, 0, 0);

describe('alarmEpisodeBridge', () => {
  it('abre episódio no carimbo do fato', () => {
    const r = applySourceReport(rule, emptyEpisode(), { sourceId: 'a', state: 'active', at: T });
    const out = bridgeAggregation(emptyRecurrenceLedger('r1:a'), r, input);
    expect(out.commands).toEqual([{ kind: 'open', seriesKey: 'r1:a', at: T, severity: 'high' }]);
    expect(out.ledger.totalEpisodes).toBe(1);
  });

  it('não move o livro quando a agregação ignora o evento', () => {
    const ledger = emptyRecurrenceLedger('r1:a');
    const r = applySourceReport(rule, emptyEpisode(), { sourceId: 'ghost', state: 'active', at: T });
    const out = bridgeAggregation(ledger, r, input);
    expect(out.skipped).toBe('event_ignored');
    expect(out.commands).toHaveLength(0);
    expect(out.ledger).toBe(ledger);
  });

  it('rearme não cria episódio novo quando já há um aberto', () => {
    let state = emptyEpisode();
    const r1 = applySourceReport(rule, state, { sourceId: 'a', state: 'active', at: T });
    state = r1.state;
    let ledger = bridgeAggregation(emptyRecurrenceLedger('r1:a'), r1, input).ledger;

    const r2 = rearmOnConnect(rule, state, [{ sourceId: 'a', state: 'active', at: T + 5000 }], T + 5000);
    const out = bridgeAggregation(ledger, r2, input);
    ledger = out.ledger;
    expect(out.commands).toHaveLength(0);
    expect(ledger.totalEpisodes).toBe(1);
  });

  it('fecha somente quando todas as origens negativam', () => {
    let state = emptyEpisode();
    let ledger = emptyRecurrenceLedger('r1:a');
    for (const [id, st, at] of [
      ['a', 'active', T],
      ['a', 'clear', T + 1000],
      ['b', 'clear', T + 2000],
    ] as const) {
      const r = applySourceReport(rule, state, { sourceId: id, state: st, at });
      state = r.state;
      ledger = bridgeAggregation(ledger, r, input).ledger;
    }
    expect(ledger.openIndex).toBeNull();
    expect(ledger.episodes[0].durationMs).toBe(2000);
  });

  it('reconciliação é idempotente e nunca inventa fim', () => {
    const state = applySourceReport(rule, emptyEpisode(), { sourceId: 'a', state: 'active', at: T }).state;
    const first = reconcileLedger(emptyRecurrenceLedger('r1:a'), state, input);
    expect(first.commands).toHaveLength(1);
    const second = reconcileLedger(first.ledger, state, input);
    expect(second.commands).toHaveLength(0);
  });

  it('entradas inválidas não lançam', () => {
    expect(() =>
      bridgeAggregation(emptyRecurrenceLedger('k'), { transition: 'opened', ignored: null, state: emptyEpisode(), activeSources: [], pendingSources: [] }, { seriesKey: '', severity: 'low' }),
    ).not.toThrow();
  });
});
