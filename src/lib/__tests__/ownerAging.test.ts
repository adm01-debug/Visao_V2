import { describe, expect, it } from 'vitest';
import type { MaintenanceAlertView } from '@/lib/maintenance/maintenanceConsoleView';
import {
  AT_RISK_FRACTION,
  OWNER_SLA_MINUTES,
  agingLabel,
  alertSlaState,
  buildOwnerAgingMap,
  computeOwnerAging,
} from '@/lib/maintenance/ownerAging';
import type { MaintenanceOwner } from '@/lib/maintenance/maintenanceOwner';

function view(overrides: Partial<MaintenanceAlertView> & { id: string }): MaintenanceAlertView {
  const owner = (overrides.routing?.owner ?? null) as MaintenanceOwner | null;
  return {
    id: overrides.id,
    routine: overrides.routine ?? 'rotina',
    severity: overrides.severity ?? 'warning',
    reason: overrides.reason ?? 'motivo',
    status: overrides.status ?? 'open',
    level: overrides.level ?? 0,
    levelLabel: overrides.levelLabel ?? 'nível',
    ageMinutes: overrides.ageMinutes ?? 0,
    minutesToNextLevel: overrides.minutesToNextLevel ?? null,
    canAcknowledge: overrides.status !== 'acknowledged',
    acknowledgedAtMs: overrides.status === 'acknowledged' ? 1 : null,
    routing:
      overrides.routing ??
      (owner === null ? null : { owner, label: owner, action: 'acao', cameras: null, scope: null }),
    profileId: overrides.profileId ?? 'operational',
    profileLabel: overrides.profileLabel ?? 'operacional (horária)',
    conditionAgeMinutes: overrides.conditionAgeMinutes ?? null,
    conditionRows: overrides.conditionRows ?? 1,
    effectiveLevel: overrides.effectiveLevel ?? overrides.level ?? 0,
    silence: overrides.silence ?? null,
    ackState: overrides.ackState ?? 'none',
    ackLabel: overrides.ackLabel ?? '',
    ackDecayed: overrides.ackDecayed ?? false,
    ackMinutesRemaining: overrides.ackMinutesRemaining ?? null,
  };
}

const routed = (owner: MaintenanceOwner) => ({
  owner,
  label: owner,
  action: 'acao',
  cameras: null,
  scope: null,
});

describe('ownerAging (Onda 149)', () => {
  it('A5 balde sem abertos fica idle', () => {
    const aging = computeOwnerAging('field_tech', [
      view({ id: 'a', status: 'acknowledged', ageMinutes: 99_999 }),
    ]);
    expect(aging.state).toBe('idle');
    expect(aging.oldestOpenMinutes).toBe(0);
    expect(aging.minutesRemaining).toBeNull();
  });

  it('A1 reconhecidos não influenciam o balde', () => {
    const base = computeOwnerAging('platform', [view({ id: 'a', ageMinutes: 10 })]);
    const withAck = computeOwnerAging('platform', [
      view({ id: 'a', ageMinutes: 10 }),
      view({ id: 'b', status: 'acknowledged', ageMinutes: 100_000, severity: 'critical' }),
    ]);
    expect(withAck).toEqual(base);
  });

  it('A3 breached ⇔ folga não positiva', () => {
    const sla = OWNER_SLA_MINUTES.network_ops.critical;
    const breach = computeOwnerAging('network_ops', [
      view({ id: 'a', severity: 'critical', ageMinutes: sla + 1 }),
    ]);
    expect(breach.state).toBe('breached');
    expect(breach.minutesRemaining).toBeLessThanOrEqual(0);

    const ok = computeOwnerAging('network_ops', [
      view({ id: 'a', severity: 'critical', ageMinutes: 1 }),
    ]);
    expect(ok.state).toBe('on_track');
    expect(ok.minutesRemaining).toBeGreaterThan(0);
  });

  it('folga positiva mínima nunca é arredondada para zero', () => {
    const sla = OWNER_SLA_MINUTES.platform.critical;
    const aging = computeOwnerAging('platform', [
      view({ id: 'a', severity: 'critical', ageMinutes: sla - 0.01 }),
    ]);
    expect(aging.state).not.toBe('breached');
    expect(aging.minutesRemaining).toBeGreaterThan(0);
  });

  it('A2 o estado é o do pior alerta aberto', () => {
    const sla = OWNER_SLA_MINUTES.registry_admin.warning;
    const aging = computeOwnerAging('registry_admin', [
      view({ id: 'a', ageMinutes: 1 }),
      view({ id: 'b', ageMinutes: 1 }),
      view({ id: 'c', ageMinutes: sla + 5 }),
    ]);
    expect(aging.state).toBe('breached');
    expect(aging.breached).toBe(1);
  });

  it('A4 envelhecer nunca melhora o estado nem aumenta a folga', () => {
    const sla = OWNER_SLA_MINUTES.field_tech.warning;
    let previous = computeOwnerAging('field_tech', [view({ id: 'a', ageMinutes: 0 })]);
    for (let age = 1; age <= sla + 20; age += 7) {
      const next = computeOwnerAging('field_tech', [view({ id: 'a', ageMinutes: age })]);
      expect(next.minutesRemaining!).toBeLessThanOrEqual(previous.minutesRemaining!);
      previous = next;
    }
    expect(previous.state).toBe('breached');
  });

  it('at_risk começa exatamente na fração do prazo', () => {
    const sla = OWNER_SLA_MINUTES.triage.warning;
    expect(alertSlaState(sla * AT_RISK_FRACTION - 0.001, sla)).toBe('on_track');
    expect(alertSlaState(sla * AT_RISK_FRACTION, sla)).toBe('at_risk');
    expect(alertSlaState(sla, sla)).toBe('breached');
  });

  it('A6 a soma dos estourados por balde bate com o total', () => {
    const rows = [
      view({ id: 'a', routing: routed('field_tech'), ageMinutes: 100_000 }),
      view({ id: 'b', routing: routed('network_ops'), ageMinutes: 100_000 }),
      view({ id: 'c', ageMinutes: 100_000 }),
      view({ id: 'd', routing: routed('platform'), ageMinutes: 0 }),
    ];
    const map = buildOwnerAgingMap(rows);
    const perBucket = [...map.entries()]
      .filter(([key]) => key !== 'all')
      .reduce((sum, [, aging]) => sum + aging.breached, 0);
    expect(perBucket).toBe(3);
    expect(map.get('all')!.breached).toBe(3);
  });

  it('A7 dono fora do vocabulário usa o prazo de triagem', () => {
    const rogue = computeOwnerAging('quem_sabe' as never, [
      view({ id: 'a', ageMinutes: OWNER_SLA_MINUTES.triage.warning + 1 }),
    ]);
    expect(rogue.state).toBe('breached');
  });

  it('agingLabel só fala quando há o que dizer', () => {
    expect(agingLabel(computeOwnerAging('platform', []))).toBeNull();
    expect(
      agingLabel(computeOwnerAging('platform', [view({ id: 'a', ageMinutes: 0 })]))
    ).toBeNull();
    expect(
      agingLabel(computeOwnerAging('platform', [view({ id: 'a', ageMinutes: 100_000 })]))
    ).toContain('fora do prazo');
  });

  it('o agregado "all" nunca é mais otimista que os baldes', () => {
    const rows = [view({ id: 'a', routing: routed('field_tech'), ageMinutes: 300 })];
    const map = buildOwnerAgingMap(rows);
    expect(map.get('all')!.state).toBe('breached');
  });
});
