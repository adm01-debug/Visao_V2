/**
 * Onda 239 — o painel passa a falar a mesma língua do cron.
 *
 * Estes testes travam o alinhamento entre a previsão exibida e a escada do
 * perfil (Onda 238). Sem eles, uma futura mudança de perfil voltaria a
 * dessincronizar painel e rotina em silêncio.
 */

import { describe, expect, it } from 'vitest';
import {
  buildMaintenanceConsole,
  minutesToNextLevelForProfile,
  type MaintenanceAlertRow,
} from '@/lib/maintenance/maintenanceConsoleView';
import { OPERATIONAL_PROFILE, SLOW_ACCOUNTING_PROFILE } from '@/lib/escalationProfiles';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MINUTE = 60_000;
const DAY = 1440;

function row(overrides: Partial<MaintenanceAlertRow> & { id: string }): MaintenanceAlertRow {
  return {
    routine: 'admission_trend:ledger_stock',
    severity: 'critical',
    reason: 'estoque órfão crescente',
    detail: {},
    created_at: new Date(NOW - 10 * MINUTE).toISOString(),
    observed_at: null,
    acknowledged_at: null,
    acknowledged_by: null,
    escalation_level: 0,
    last_escalated_at: null,
    ...overrides,
  };
}

describe('perfil aplicado no console', () => {
  it('fonte de contabilidade usa a escada diária, não a operacional', () => {
    const model = buildMaintenanceConsole([row({ id: 'a' })], NOW);
    const view = model.rows[0];
    expect(view.profileId).toBe('slow_accounting');
    // 1 dia menos os 10 minutos já decorridos — jamais os 30 min operacionais.
    expect(view.minutesToNextLevel).toBeCloseTo(DAY - 10, 1);
  });

  it('rotina operacional permanece inalterada (não-regressão da Onda 117)', () => {
    const model = buildMaintenanceConsole(
      [row({ id: 'a', routine: 'retention:collab_entry_purge_runs' })],
      NOW,
    );
    expect(model.rows[0].profileId).toBe('operational');
    expect(model.rows[0].minutesToNextLevel).toBeCloseTo(20, 1);
  });

  it('a âncora da condição faz o crônico renovado aparecer com a idade real', () => {
    const model = buildMaintenanceConsole(
      [
        row({ id: 'hoje', created_at: new Date(NOW - 30 * MINUTE).toISOString() }),
        row({ id: 'ontem', created_at: new Date(NOW - 1 * DAY * MINUTE).toISOString() }),
        row({ id: 'anteontem', created_at: new Date(NOW - 5 * DAY * MINUTE).toISOString() }),
      ],
      NOW,
    );
    const hoje = model.rows.find((r) => r.id === 'hoje')!;
    expect(hoje.conditionAgeMinutes).toBeCloseTo(5 * DAY, 1);
    expect(hoje.conditionRows).toBe(3);
    // Com 5 dias de condição e nível 0, o próximo degrau já está vencido.
    expect(hoje.minutesToNextLevel).toBe(0);
  });

  it('reconhecer reancora a sequência', () => {
    const model = buildMaintenanceConsole(
      [
        row({
          id: 'velha',
          created_at: new Date(NOW - 40 * DAY * MINUTE).toISOString(),
          acknowledged_at: new Date(NOW - 20 * DAY * MINUTE).toISOString(),
          acknowledged_by: 'admin',
          escalation_level: 3,
        }),
        row({ id: 'nova', created_at: new Date(NOW - 60 * MINUTE).toISOString() }),
      ],
      NOW,
    );
    const nova = model.rows.find((r) => r.id === 'nova')!;
    expect(nova.conditionAgeMinutes).toBeCloseTo(60, 1);
    expect(nova.effectiveLevel).toBe(0);
  });

  it('resumo conta os abertos governados por perfil lento', () => {
    const model = buildMaintenanceConsole(
      [row({ id: 'a' }), row({ id: 'b', routine: 'agent_healing:fleet' })],
      NOW,
    );
    expect(model.summary.slowProfile).toBe(1);
  });

  it('aviso diário nunca prevê degrau para o plantão', () => {
    expect(
      minutesToNextLevelForProfile(SLOW_ACCOUNTING_PROFILE, 'warning', 2, 10_000_000, null),
    ).toBeNull();
    expect(minutesToNextLevelForProfile(OPERATIONAL_PROFILE, 'warning', 2, 10_000, null)).toBeNull();
  });
});
