import { describe, expect, it } from 'vitest';
import {
  readInventory,
  reconcileAdmissionLedger,
  reconcileSeverity,
  reconcileVerdictLabel,
} from '../admissionReconciliation.ts';
import { readPurgeRun, type PurgeRunReading } from '../admissionPurgeHistory.ts';

const T0 = Date.parse('2026-07-01T03:47:00.000Z');

function run(overrides: Partial<Record<string, unknown>> = {}): PurgeRunReading {
  return readPurgeRun({
    id: 'r1',
    executed_at: new Date(T0).toISOString(),
    cutoff_at: new Date(T0 - 365 * 86_400_000).toISOString(),
    retention_days: 365,
    batch_cap: 50_000,
    deleted_count: 10,
    deferred_count: 0,
    quarantined_count: 0,
    capped: false,
    duration_ms: 12,
    ...overrides,
  });
}

function inv(overrides: Record<string, unknown> = {}) {
  return {
    observed_at: new Date(T0 + 3_600_000).toISOString(),
    cutoff_at: new Date(T0 + 3_600_000 - 365 * 86_400_000).toISOString(),
    retention_days: 365,
    expired_stock: '0',
    drift_stock: '0',
    quarantined_stock: '0',
    total_stock: '100',
    ...overrides,
  };
}

describe('Onda 233 — conciliação estoque × trilha', () => {
  it('J1 — inventário ausente ou ilegível nunca é conciliado', () => {
    expect(reconcileAdmissionLedger(null, run()).verdict).toBe('indeterminate');
    expect(reconcileAdmissionLedger(inv({ expired_stock: '-3' }), run()).verdict).toBe(
      'indeterminate'
    );
    expect(readInventory(inv({ observed_at: 'ontem' })).reason).toBe('inventario_sem_relogio');
    expect(readInventory(inv({ expired_stock: '200' })).reason).toBe('contabilidade_impossivel');
  });

  it('J2 — foto anterior à execução é obsoleta, nunca acusação', () => {
    const snap = reconcileAdmissionLedger(
      inv({ observed_at: new Date(T0 - 60_000).toISOString(), expired_stock: '99' }),
      run()
    );
    expect(snap.verdict).toBe('indeterminate');
    expect(snap.orphanCount).toBe(0);
  });

  it('J3 — estoque vencido sem execução legível é no_run, nunca unaccounted', () => {
    const contested = run({ deferred_count: 5, capped: false });
    expect(contested.status).toBe('inconsistent');
    const snap = reconcileAdmissionLedger(inv({ expired_stock: '7' }), contested);
    expect(snap.verdict).toBe('no_run');
    expect(snap.orphanCount).toBe(0);
    expect(reconcileAdmissionLedger(inv(), null).verdict).toBe('reconciled');
  });

  it('J4/J5 — deriva absorve o vencido recente; o excedente vira órfão', () => {
    const r = run({ deferred_count: 2, capped: true });
    expect(reconcileAdmissionLedger(inv({ expired_stock: '5', drift_stock: '3' }), r).verdict).toBe(
      'reconciled'
    );
    const orphan = reconcileAdmissionLedger(inv({ expired_stock: '9', drift_stock: '3' }), r);
    expect(orphan.verdict).toBe('unaccounted');
    expect(orphan.orphanCount).toBe(4);
    expect(orphan.severity).toBe('critical');
  });

  it('J6 — dívida maior que o estoque é drenagem, não falha', () => {
    const r = run({ deferred_count: 8, capped: true });
    const snap = reconcileAdmissionLedger(inv({ expired_stock: '1' }), r);
    expect(snap.verdict).toBe('settling');
    expect(reconcileSeverity(snap.verdict)).toBe('none');
  });

  it('J7 — quarentena é eixo separado e nunca vira órfão', () => {
    const snap = reconcileAdmissionLedger(
      inv({ expired_stock: '0', quarantined_stock: '11' }),
      run()
    );
    expect(snap.verdict).toBe('reconciled');
    expect(snap.quarantinedStock).toBe(11);
    expect(snap.orphanCount).toBe(0);
  });

  it('J8 — bigint em texto é aceito; texto qualquer não', () => {
    expect(readInventory(inv({ total_stock: '9007199254740991' })).readable).toBe(true);
    expect(readInventory(inv({ total_stock: 'muitos' })).readable).toBe(false);
    expect(reconcileVerdictLabel('unaccounted')).toBe('estoque vencido sem dono');
  });
});
