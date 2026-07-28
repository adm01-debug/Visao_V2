import { describe, it, expect } from 'vitest';
import {
  buildOrphanAlert,
  orphanAlertSeverity,
  orphanCooldownMinutes,
  admissionReconcileRoutineKey,
  BENIGN_RACE_REASON,
} from '../admissionOrphanAlert.ts';
import {
  reconcileAdmissionLedger,
  type ReconcileSnapshot,
} from '../admissionReconciliation.ts';
import { readPurgeRun } from '../admissionPurgeHistory.ts';

const NOW = Date.parse('2026-07-28T03:53:00.000Z');
const DAY = 86_400_000;

function validRun(deferred: number, at = NOW - 3_600_000) {
  return readPurgeRun({
    id: 'run-1',
    executed_at: new Date(at).toISOString(),
    cutoff_at: new Date(at - 365 * DAY).toISOString(),
    retention_days: 365,
    batch_cap: 500,
    deleted_count: 10,
    deferred_count: deferred,
    capped: deferred > 0,
    quarantined_count: 0,
    duration_ms: 120,
  });
}

function inventory(expired: number, drift = 0) {
  return {
    observed_at: new Date(NOW).toISOString(),
    cutoff_at: new Date(NOW - 365 * DAY).toISOString(),
    retention_days: 365,
    expired_stock: String(expired),
    drift_stock: String(drift),
    quarantined_stock: '2',
    total_stock: String(expired + 50),
  };
}

describe('Onda 234 — fan-in do órfão (K1–K8)', () => {
  it('K2: estoque sem dono vira alerta crítico com os números na frase', () => {
    const snapshot = reconcileAdmissionLedger(inventory(9), validRun(0));
    expect(snapshot.verdict).toBe('unaccounted');

    const alert = buildOrphanAlert(snapshot)!;
    expect(alert.severity).toBe('critical');
    expect(alert.routine).toBe('admission_reconcile:ledger_stock');
    expect(alert.detail.orphan_count).toBe(9);
    expect(alert.reason).toContain('9 janela(s) vencida(s) sem dono');
    expect(alert.reason).toContain('cadência 1440 min');
  });

  it('K3: estoque vencido sem execução legível é aviso, não crítico', () => {
    const snapshot = reconcileAdmissionLedger(inventory(4), null);
    expect(snapshot.verdict).toBe('no_run');
    expect(buildOrphanAlert(snapshot)!.severity).toBe('warning');
  });

  it('K4: corrida benigna (foto anterior à execução) nunca alerta', () => {
    const snapshot = reconcileAdmissionLedger(inventory(4), validRun(0, NOW + 60_000));
    expect(snapshot.verdict).toBe('indeterminate');
    expect(snapshot.reason).toBe(BENIGN_RACE_REASON);
    expect(buildOrphanAlert(snapshot)).toBeNull();
  });

  it('K4: cegueira estrutural do inventário vira aviso', () => {
    const snapshot = reconcileAdmissionLedger({ observed_at: null }, validRun(0));
    expect(snapshot.verdict).toBe('indeterminate');
    expect(buildOrphanAlert(snapshot)!.severity).toBe('warning');
  });

  it('K5: conciliado e drenando permanecem em silêncio', () => {
    expect(buildOrphanAlert(reconcileAdmissionLedger(inventory(0), validRun(0)))).toBeNull();
    expect(buildOrphanAlert(reconcileAdmissionLedger(inventory(1), validRun(5)))).toBeNull();
  });

  it('K6: cooldown fica na faixa e o crítico reaparece antes do aviso', () => {
    expect(orphanCooldownMinutes(1440, 'critical')).toBe(720);
    expect(orphanCooldownMinutes(1440, 'warning')).toBe(1440);
    expect(orphanCooldownMinutes(15, 'warning')).toBe(60);
    expect(orphanCooldownMinutes(100_000, 'critical')).toBe(1440);
    expect(() => orphanCooldownMinutes(0, 'critical')).toThrow(RangeError);
  });

  it('K1: severidade não se deixa influenciar por contadores', () => {
    const base: ReconcileSnapshot = reconcileAdmissionLedger(inventory(1), validRun(0));
    const huge: ReconcileSnapshot = reconcileAdmissionLedger(inventory(999_999), validRun(0));
    expect(buildOrphanAlert(base)!.severity).toBe(buildOrphanAlert(huge)!.severity);
    expect(orphanAlertSeverity('unaccounted', BENIGN_RACE_REASON)).toBe('critical');
  });

  it('K7: chave é própria e não colide com o fan-in de passivo', () => {
    expect(admissionReconcileRoutineKey()).toBe('admission_reconcile:ledger_stock');
    expect(admissionReconcileRoutineKey('outro')).toBe('admission_reconcile:outro');
    expect(admissionReconcileRoutineKey().startsWith('admission_backlog:')).toBe(false);
  });

  it('K8: dívida assumida sempre fecha no detalhe', () => {
    const alert = buildOrphanAlert(reconcileAdmissionLedger(inventory(20, 3), validRun(2)))!;
    expect(alert.detail.accounted_for).toBe(
      alert.detail.declared_deferred + alert.detail.drift_stock,
    );
    expect(alert.detail.orphan_count).toBe(20 - 5);
  });

  it('entrada ausente nunca inventa alerta', () => {
    expect(buildOrphanAlert(null)).toBeNull();
    expect(buildOrphanAlert(undefined)).toBeNull();
  });
});
