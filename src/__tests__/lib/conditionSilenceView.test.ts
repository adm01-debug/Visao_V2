import { describe, expect, it } from 'vitest';
import {
  buildConditionSilence,
  conditionSilenceWindowMinutes,
  indexConditionNotices,
  type ConditionNoticeRow,
} from '@/lib/maintenance/conditionSilence';
import { CONDITION_THROTTLE_PREFIXES } from '../../../supabase/functions/_shared/maintenanceDispatchPolicy';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MIN = 60_000;

function notice(over: Partial<ConditionNoticeRow> = {}): ConditionNoticeRow {
  return {
    conditionKey: 'admission_trend:ledger_stock',
    channel: 'telegram',
    severity: 'critical',
    status: 'sent',
    sentAt: new Date(NOW - 60 * MIN).toISOString(),
    ...over,
  };
}

function build(notices: ConditionNoticeRow[], severity: 'warning' | 'critical' = 'critical') {
  return buildConditionSilence(
    'admission_trend:ledger_stock',
    severity,
    indexConditionNotices(notices, NOW),
    NOW,
  );
}

describe('Onda 241 — silêncio visível por condição', () => {
  it('R2 — perfil operacional nunca silencia', () => {
    expect(conditionSilenceWindowMinutes('partition_drain')).toBe(0);
    expect(
      buildConditionSilence(
        'partition_drain',
        'critical',
        indexConditionNotices([notice({ conditionKey: 'partition_drain' })], NOW),
        NOW,
      ),
    ).toBeNull();
  });

  it('R2 — a janela é a mesma que a edge function aplica (paridade Q2)', () => {
    for (const [prefix, minutes] of CONDITION_THROTTLE_PREFIXES) {
      expect(conditionSilenceWindowMinutes(`${prefix}x`)).toBe(minutes);
    }
  });

  it('R3 — falha de transporte não cala', () => {
    expect(build([notice({ status: 'failed' })])).toBeNull();
    expect(build([notice({ status: 'skipped' })])).toBeNull();
  });

  it('R4 — agravamento fura o silêncio', () => {
    const view = build([notice({ severity: 'warning' })], 'critical');
    expect(view?.breaksOnEscalation).toBe(true);
    expect(view?.silencedChannels).toBe(0);
    expect(view?.remainingMinutes).toBeNull();
  });

  it('R5 — relógio ilegível ou futuro é fail-open', () => {
    expect(build([notice({ sentAt: 'ontem' })])).toBeNull();
    expect(build([notice({ sentAt: null })])).toBeNull();
    expect(build([notice({ sentAt: new Date(NOW + MIN).toISOString() })])).toBeNull();
  });

  it('R6 — o restante é o do canal que demora mais a voltar a falar', () => {
    const view = build([
      notice({ channel: 'telegram', sentAt: new Date(NOW - 100 * MIN).toISOString() }),
      notice({ channel: 'email', sentAt: new Date(NOW - 900 * MIN).toISOString() }),
    ]);
    expect(view?.silencedChannels).toBe(2);
    expect(view?.remainingMinutes).toBeCloseTo(1440 - 100, 1);
  });

  it('R7 — condição sem entrega não é silenciada', () => {
    expect(build([])).toBeNull();
  });

  it('R9 — janela vencida deixa de calar', () => {
    const view = build([notice({ sentAt: new Date(NOW - 1441 * MIN).toISOString() })]);
    expect(view?.channels[0].state).toBe('expired');
    expect(view?.remainingMinutes).toBeNull();
  });

  it('R10 — canal desconhecido é descartado', () => {
    expect(build([notice({ channel: 'sms' })])).toBeNull();
  });
});
