import { describe, expect, it } from 'vitest';
import {
  ADMISSION_BACKLOG_LABEL,
  COOLDOWN_CEILING_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
  PERSIST_RUNS,
  admissionBacklogRoutineKey,
  assessBacklogFromRows,
  backlogCooldownMinutes,
  backlogVerdictLabel,
  evaluateAdmissionBacklog,
  severityForVerdict,
} from '../admissionBacklogAlert';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const DAY = 86_400_000;

/** Linha íntegra por padrão; `deferred` governa o espelho `capped`. */
function run(over: { id?: string; ago?: number; deferred?: number; batchCap?: number } = {}) {
  const deferred = over.deferred ?? 0;
  return {
    id: over.id ?? `run-${over.ago ?? 0}`,
    executed_at: new Date(NOW - (over.ago ?? 0) * DAY).toISOString(),
    cutoff_at: new Date(NOW - 400 * DAY).toISOString(),
    retention_days: 365,
    batch_cap: over.batchCap ?? 50_000,
    deleted_count: 10,
    deferred_count: deferred,
    quarantined_count: 0,
    capped: deferred > 0,
    duration_ms: 12,
  };
}

describe('Onda 232 — fan-in do passivo do expurgo', () => {
  it('I2: sem execução legível não acusa passivo', () => {
    expect(assessBacklogFromRows([]).verdict).toBe('no_data');
    expect(assessBacklogFromRows([{ ...run(), executed_at: null }]).verdict).toBe('no_data');
    expect(evaluateAdmissionBacklog([])).toBeNull();
  });

  it('I1: linha contestada não vira prova nem alívio', () => {
    // espelho de teto divergente => inconsistent => ignorada
    const dirty = { ...run({ deferred: 500 }), capped: false };
    expect(assessBacklogFromRows([dirty]).verdict).toBe('no_data');
  });

  it('I3: passivo zerado na execução mais recente encerra', () => {
    const rows = [run({ id: 'a', ago: 0, deferred: 0 }), run({ id: 'b', ago: 1, deferred: 900 })];
    const a = assessBacklogFromRows(rows);
    expect(a.verdict).toBe('clear');
    expect(evaluateAdmissionBacklog(rows)).toBeNull();
  });

  it('I4: passivo isolado é aviso', () => {
    const alert = evaluateAdmissionBacklog([
      run({ id: 'a', ago: 0, deferred: 120 }),
      run({ id: 'b', ago: 1, deferred: 0 }),
    ]);
    expect(alert?.severity).toBe('warning');
    expect(alert?.verdict).toBe('spike');
    expect(alert?.reason).toContain(ADMISSION_BACKLOG_LABEL);
    expect(alert?.reason).toContain('120');
  });

  it('I5: passivo estável e persistente é crítico', () => {
    const rows = Array.from({ length: PERSIST_RUNS }, (_, i) =>
      run({ id: `r${i}`, ago: i, deferred: 300 }),
    );
    const alert = evaluateAdmissionBacklog(rows);
    expect(alert?.verdict).toBe('persistent');
    expect(alert?.severity).toBe('critical');
    expect(alert?.detail.consecutive_runs).toBe(PERSIST_RUNS);
  });

  it('I6: passivo crescente é crítico antes mesmo da persistência', () => {
    const alert = evaluateAdmissionBacklog([
      run({ id: 'a', ago: 0, deferred: 200 }),
      run({ id: 'b', ago: 1, deferred: 100 }),
    ]);
    expect(alert?.verdict).toBe('growing');
    expect(alert?.severity).toBe('critical');
    expect(alert?.detail.trend).toEqual([100, 200]);
  });

  it('passivo decrescente não é crescente', () => {
    const a = assessBacklogFromRows([
      run({ id: 'a', ago: 0, deferred: 50 }),
      run({ id: 'b', ago: 1, deferred: 100 }),
      run({ id: 'c', ago: 2, deferred: 150 }),
    ]);
    expect(a.verdict).toBe('persistent');
  });

  it('I7: cooldown fica dentro do piso e do teto e é monotônico', () => {
    expect(() => backlogCooldownMinutes(0)).toThrow(RangeError);
    expect(() => backlogCooldownMinutes(Number.NaN)).toThrow(RangeError);
    let previous = 0;
    for (let c = 1; c <= 5_000; c += 1) {
      const v = backlogCooldownMinutes(c);
      expect(v).toBeGreaterThanOrEqual(COOLDOWN_FLOOR_MINUTES);
      expect(v).toBeLessThanOrEqual(COOLDOWN_CEILING_MINUTES);
      expect(v).toBeGreaterThanOrEqual(previous);
      previous = v;
    }
  });

  it('I8: chave prefixada e mapeamento total de severidade', () => {
    expect(admissionBacklogRoutineKey()).toBe('admission_backlog:ledger_purge');
    expect(severityForVerdict('clear')).toBeNull();
    expect(severityForVerdict('no_data')).toBeNull();
    expect(severityForVerdict('spike')).toBe('warning');
    expect(severityForVerdict('persistent')).toBe('critical');
    expect(severityForVerdict('growing')).toBe('critical');
    expect(backlogVerdictLabel('growing')).toBe('passivo crescente');
  });

  it('é determinístico independentemente da ordem de chegada', () => {
    const rows = [
      run({ id: 'c', ago: 2, deferred: 10 }),
      run({ id: 'a', ago: 0, deferred: 30 }),
      run({ id: 'b', ago: 1, deferred: 20 }),
    ];
    const forward = assessBacklogFromRows(rows);
    const backward = assessBacklogFromRows([...rows].reverse());
    expect(forward).toEqual(backward);
    expect(forward.trend).toEqual([10, 20, 30]);
  });
});
