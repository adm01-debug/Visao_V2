import { describe, expect, it } from 'vitest';
import {
  COOLDOWN_CEILING_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
  evaluateRetentionAlerts,
  retentionCooldownMinutes,
  retentionRoutineKey,
  severityForHealth,
} from '../retentionAlerts';
import { RETENTION_ROUTINES, retentionThresholds } from '../retentionRegistry';

describe('Onda 135 — fan-in das rotinas de retenção', () => {
  it('não emite nada quando todas as rotinas estão em dia', () => {
    const observations = RETENTION_ROUTINES.map((r) => ({
      jobName: r.jobName,
      minutesSinceLastRun: 0,
    }));
    expect(evaluateRetentionAlerts(observations)).toEqual([]);
  });

  it('trata rotina registrada sem observação como nunca executada (crítico)', () => {
    const alerts = evaluateRetentionAlerts([]);
    expect(alerts).toHaveLength(RETENTION_ROUTINES.length);
    for (const alert of alerts) {
      expect(alert.severity).toBe('critical');
      expect(alert.health).toBe('never');
      expect(alert.reason).toContain('nunca executou');
    }
  });

  it('ignora observações de rotinas não registradas', () => {
    const alerts = evaluateRetentionAlerts(
      [{ jobName: 'rotina_fantasma', minutesSinceLastRun: 99_999 }],
      [],
    );
    expect(alerts).toEqual([]);
  });

  it('prefixa a chave de rotina para não colidir com detectores homônimos', () => {
    expect(retentionRoutineKey('collab_entries')).toBe('retention:collab_entries');
  });

  it('mapeia saúde para severidade de forma total', () => {
    expect(severityForHealth('ok')).toBeNull();
    expect(severityForHealth('warn')).toBe('warning');
    expect(severityForHealth('stalled')).toBe('critical');
    expect(severityForHealth('never')).toBe('critical');
  });

  it('rejeita cadência inválida em vez de silenciar o erro', () => {
    expect(() => retentionCooldownMinutes(0)).toThrow(RangeError);
    expect(() => retentionCooldownMinutes(Number.NaN)).toThrow(RangeError);
    expect(() => retentionCooldownMinutes(-30)).toThrow(RangeError);
  });

  it('mantém o cooldown dentro do piso e do teto e monotônico', () => {
    let previous = 0;
    for (let cadence = 1; cadence <= 5_000; cadence += 1) {
      const cooldown = retentionCooldownMinutes(cadence);
      expect(cooldown).toBeGreaterThanOrEqual(COOLDOWN_FLOOR_MINUTES);
      expect(cooldown).toBeLessThanOrEqual(COOLDOWN_CEILING_MINUTES);
      expect(cooldown).toBeGreaterThanOrEqual(previous);
      previous = cooldown;
    }
  });

  it('respeita as fronteiras exatas de cada cadência registrada', () => {
    for (const routine of RETENTION_ROUTINES) {
      const { warnAfterMinutes, stalledAfterMinutes } = retentionThresholds(routine.cadenceMinutes);
      const at = (minutes: number) =>
        evaluateRetentionAlerts([{ jobName: routine.jobName, minutesSinceLastRun: minutes }], [
          routine,
        ])[0] ?? null;

      expect(at(warnAfterMinutes - 0.001)).toBeNull();
      expect(at(warnAfterMinutes)?.severity).toBe('warning');
      expect(at(stalledAfterMinutes - 0.001)?.severity).toBe('warning');
      expect(at(stalledAfterMinutes)?.severity).toBe('critical');
    }
  });

  it('simula milhares de silêncios sem regressão de monotonia', () => {
    for (const routine of RETENTION_ROUTINES) {
      const rank = { ok: 0, warning: 1, critical: 2 } as const;
      let previous = -1;
      for (let minutes = -120; minutes <= routine.cadenceMinutes * 6; minutes += 7) {
        const alert = evaluateRetentionAlerts(
          [{ jobName: routine.jobName, minutesSinceLastRun: minutes }],
          [routine],
        )[0];
        const current = alert ? rank[alert.severity] : rank.ok;
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('trata silêncio negativo como zero (relógio adiantado)', () => {
    const routine = RETENTION_ROUTINES[0];
    expect(
      evaluateRetentionAlerts([{ jobName: routine.jobName, minutesSinceLastRun: -10_000 }], [
        routine,
      ]),
    ).toEqual([]);
  });

  it('escreve motivos em português com rótulo humano e cadência', () => {
    const routine = RETENTION_ROUTINES[3];
    const alert = evaluateRetentionAlerts(
      [{ jobName: routine.jobName, minutesSinceLastRun: 10_000 }],
      [routine],
    )[0];
    expect(alert.reason).toContain(routine.label);
    expect(alert.reason).toContain(`${routine.cadenceMinutes} min`);
  });
});
