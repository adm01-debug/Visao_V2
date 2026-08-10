/**
 * Onda 240 — silêncio por condição no despacho externo (leis Q1–Q10).
 */
import { describe, it, expect } from 'vitest';
import {
  planDispatch,
  conditionKeyFor,
  conditionThrottleMinutes,
  DEFAULT_DISPATCH_CONFIG,
  type ConditionNotice,
  type DispatchConfig,
  type MaintenanceAlert,
} from '../../../supabase/functions/_shared/maintenanceDispatchPolicy';
import { escalationProfileFor, SLOW_ACCOUNTING_PROFILE } from '../../lib/escalationProfiles';

const NOW = Date.parse('2026-07-28T03:00:00.000Z');
const MIN = 60_000;

const cfg = (over: Partial<DispatchConfig> = {}): DispatchConfig => ({
  ...DEFAULT_DISPATCH_CONFIG,
  channels: ['telegram', 'email'],
  minSeverity: 'warning',
  ...over,
});

const alert = (over: Partial<MaintenanceAlert> = {}): MaintenanceAlert => ({
  id: 'a1',
  routine: 'admission_trend:ledger_stock',
  severity: 'critical',
  reason: 'órfão crescente',
  created_at: new Date(NOW - MIN).toISOString(),
  ...over,
});

const notice = (over: Partial<ConditionNotice> = {}): ConditionNotice => ({
  conditionKey: 'admission_trend:ledger_stock',
  channel: 'telegram',
  severity: 'critical',
  sentAt: new Date(NOW - 60 * MIN).toISOString(),
  ...over,
});

describe('Onda 240 — silêncio por condição', () => {
  it('Q1 expõe a chave da condição no item planejado', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW, []);
    expect(plan.items.every((i) => i.conditionKey === 'admission_trend:ledger_stock')).toBe(true);
    expect(conditionKeyFor(alert())).toBe('admission_trend:ledger_stock');
  });

  it('Q2 espelha a janela do perfil de escalada da Onda 238', () => {
    expect(conditionThrottleMinutes('admission_trend:ledger_stock')).toBe(
      SLOW_ACCOUNTING_PROFILE.minStepMinutes
    );
    expect(escalationProfileFor('partition_drain').id).toBe('operational');
    expect(conditionThrottleMinutes('partition_drain')).toBe(0);
  });

  it('cala a reemissão diária da mesma condição no canal já notificado', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW, [notice()]);
    expect(plan.items.map((i) => i.channel)).toEqual(['email']);
    const skip = plan.skipped.find((s) => s.reason === 'condition_throttled');
    expect(skip?.channel).toBe('telegram');
    expect(skip?.detail?.remainingMinutes).toBe(1380);
  });

  it('Q3 agravamento fura o silêncio', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW, [notice({ severity: 'warning' })]);
    expect(plan.items).toHaveLength(2);
  });

  it('Q4 falha de transporte nunca silencia', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW, []);
    expect(plan.items).toHaveLength(2);
  });

  it('Q6 relógio no futuro não silencia', () => {
    const plan = planDispatch([alert()], [], cfg(), NOW, [
      notice({ sentAt: new Date(NOW + MIN).toISOString() }),
    ]);
    expect(plan.items).toHaveLength(2);
  });

  it('Q10 rajada da mesma condição rende um envio por canal', () => {
    const burst = [alert({ id: 'b1' }), alert({ id: 'b2' }), alert({ id: 'b3' })];
    const plan = planDispatch(burst, [], cfg(), NOW, []);
    expect(plan.items).toHaveLength(2);
    expect(plan.skipped.filter((s) => s.reason === 'condition_throttled')).toHaveLength(4);
  });

  it('não regride fontes operacionais', () => {
    const burst = [
      alert({ id: 'o1', routine: 'partition_drain' }),
      alert({ id: 'o2', routine: 'partition_drain' }),
    ];
    const plan = planDispatch(burst, [], cfg(), NOW, [notice({ conditionKey: 'partition_drain' })]);
    expect(plan.items).toHaveLength(4);
    expect(plan.skipped).toHaveLength(0);
  });
});
