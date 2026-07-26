import { describe, it, expect } from 'vitest';
import {
  evaluateMaintenanceSources,
  DEFAULT_MAINTENANCE_SOURCE_THRESHOLDS as T,
  MAINTENANCE_SOURCE_LABELS,
  type ClockSkewRunSnapshot,
  type BacklogVerdictLike,
} from '@/lib/maintenanceSourceAlerts';

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const H = 3_600_000;

const healthyRun = (over: Partial<ClockSkewRunSnapshot> = {}): ClockSkewRunSnapshot => ({
  ranAtMs: NOW - H,
  ok: true,
  errorDetail: null,
  camerasAnalyzed: 60,
  camerasWarning: 0,
  camerasCritical: 0,
  ...over,
});

const verdict = (over: Partial<BacklogVerdictLike> = {}): BacklogVerdictLike => ({
  parent: 'plate_detections',
  severity: 'ok',
  currentRows: 0,
  hoursToSaturation: null,
  stale: false,
  ...over,
});

const run = (clockSkewRun: ClockSkewRunSnapshot | null, backlogVerdicts: BacklogVerdictLike[]) =>
  evaluateMaintenanceSources({ nowMs: NOW, clockSkewRun, backlogVerdicts });

const of = (out: ReturnType<typeof run>, routine: string) =>
  out.find((c) => c.routine === routine) ?? null;

describe('evaluateMaintenanceSources — detector de relógio', () => {
  it('não emite nada quando a frota está saudável', () => {
    expect(of(run(healthyRun(), [verdict()]), 'camera_clock_skew')).toBeNull();
  });

  it('trata detector inexistente como crítico', () => {
    const c = of(run(null, [verdict()]), 'camera_clock_skew');
    expect(c?.severity).toBe('critical');
    expect(c?.detail.never_ran).toBe(true);
    expect(c?.observedAtMs).toBeNull();
  });

  it('marca execução obsoleta como crítica', () => {
    const c = of(run(healthyRun({ ranAtMs: NOW - (T.staleHours + 1) * H }), []), 'camera_clock_skew');
    expect(c?.severity).toBe('critical');
    expect(c?.detail.stale).toBe(true);
  });

  it('não considera obsoleta uma execução exatamente no limite', () => {
    expect(of(run(healthyRun({ ranAtMs: NOW - T.staleHours * H }), []), 'camera_clock_skew')).toBeNull();
  });

  it('prioriza falha de execução sobre contagens medidas', () => {
    const c = of(
      run(healthyRun({ ok: false, errorDetail: 'timeout', camerasCritical: 9 }), []),
      'camera_clock_skew',
    );
    expect(c?.severity).toBe('critical');
    expect(c?.reason).toContain('timeout');
  });

  it('escala para crítico com câmeras críticas e para atenção com apenas warnings', () => {
    expect(of(run(healthyRun({ camerasCritical: 2, camerasWarning: 5 }), []), 'camera_clock_skew')?.severity).toBe(
      'critical',
    );
    expect(of(run(healthyRun({ camerasWarning: 5 }), []), 'camera_clock_skew')?.severity).toBe('warning');
  });

  it('tolera recuo do relógio do servidor sem alarme falso', () => {
    expect(of(run(healthyRun({ ranAtMs: NOW + 5 * H }), []), 'camera_clock_skew')).toBeNull();
  });
});

describe('evaluateMaintenanceSources — backlog das partições', () => {
  it('trata coletor cego como crítico', () => {
    const c = of(run(healthyRun(), []), 'partition_backlog_trend');
    expect(c?.severity).toBe('critical');
    expect(c?.detail.blind).toBe(true);
  });

  it('trata série obsoleta como crítica mesmo se a severidade for ok', () => {
    const c = of(run(healthyRun(), [verdict({ stale: true })]), 'partition_backlog_trend');
    expect(c?.severity).toBe('critical');
  });

  it('escolhe o pai que satura primeiro', () => {
    const c = of(
      run(healthyRun(), [
        verdict({ parent: 'a', severity: 'critical', hoursToSaturation: 80, currentRows: 90_000 }),
        verdict({ parent: 'b', severity: 'critical', hoursToSaturation: 3, currentRows: 60_000 }),
      ]),
      'partition_backlog_trend',
    );
    expect(c?.detail.parent).toBe('b');
    expect(c?.reason).toContain('satura em');
  });

  it('coloca crítico sem projeção atrás de crítico com saturação iminente', () => {
    const c = of(
      run(healthyRun(), [
        verdict({ parent: 'sem-projecao', severity: 'critical', hoursToSaturation: null }),
        verdict({ parent: 'iminente', severity: 'critical', hoursToSaturation: 10 }),
      ]),
      'partition_backlog_trend',
    );
    expect(c?.detail.parent).toBe('iminente');
  });

  it('não infla severidade quando só há warnings', () => {
    const c = of(
      run(healthyRun(), [verdict({ severity: 'warning', currentRows: 12_000 })]),
      'partition_backlog_trend',
    );
    expect(c?.severity).toBe('warning');
  });

  it('emite no máximo um candidato por rotina', () => {
    const out = run(healthyRun({ camerasCritical: 1 }), [
      verdict({ parent: 'a', severity: 'critical' }),
      verdict({ parent: 'b', severity: 'critical' }),
    ]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((c) => c.routine)).size).toBe(2);
  });

  it('mantém as rotinas independentes entre si', () => {
    const backlog = [verdict({ severity: 'warning', currentRows: 11_000 })];
    expect(of(run(null, backlog), 'partition_backlog_trend')).toEqual(
      of(run(healthyRun(), backlog), 'partition_backlog_trend'),
    );
  });

  it('só usa severidades aceitas pela tabela de alertas', () => {
    const out = run(null, []);
    expect(out.every((c) => c.severity === 'warning' || c.severity === 'critical')).toBe(true);
    expect(out.every((c) => c.reason.trim().length > 0)).toBe(true);
  });

  it('expõe rótulos PT-BR para as duas rotinas', () => {
    expect(MAINTENANCE_SOURCE_LABELS.camera_clock_skew).toBe('Relógio das câmeras');
    expect(MAINTENANCE_SOURCE_LABELS.partition_backlog_trend).toBe('Tendência do backlog');
  });
});
