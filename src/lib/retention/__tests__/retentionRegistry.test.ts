import { describe, expect, it } from 'vitest';
import {
  classifyRetentionHealth,
  findRetentionRoutine,
  GRACE_MINUTES,
  isRetentionActionable,
  RETENTION_ROUTINES,
  retentionThresholds,
  STALLED_CADENCE_FACTOR,
  WARN_CADENCE_FACTOR,
  type RetentionHealth,
} from '../retentionRegistry';

const CADENCES = [1, 5, 15, 30, 60, 120, 360, 720, 1440, 10080];

describe('registro de rotinas de retenção', () => {
  it('não tem nomes nem tabelas duplicados', () => {
    const names = RETENTION_ROUTINES.map((r) => r.jobName);
    const tables = RETENTION_ROUTINES.map((r) => r.sourceTable);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(tables).size).toBe(tables.length);
  });

  it('mantém ordem alfabética por tabela de origem', () => {
    const tables = RETENTION_ROUTINES.map((r) => r.sourceTable);
    expect(tables).toEqual([...tables].sort());
  });

  it('declara cadência positiva e rótulo não vazio', () => {
    for (const routine of RETENTION_ROUTINES) {
      expect(routine.cadenceMinutes).toBeGreaterThan(0);
      expect(routine.sourceTable.endsWith('_purge_runs')).toBe(true);
      expect(routine.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('é consultável por nome', () => {
    for (const routine of RETENTION_ROUTINES) {
      expect(findRetentionRoutine(routine.jobName)).toBe(routine);
    }
    expect(findRetentionRoutine('inexistente')).toBeUndefined();
  });
});

describe('limiares derivados da cadência', () => {
  it('respeita a fórmula declarada', () => {
    for (const cadence of CADENCES) {
      const { warnAfterMinutes, stalledAfterMinutes } = retentionThresholds(cadence);
      expect(warnAfterMinutes).toBe(WARN_CADENCE_FACTOR * cadence + GRACE_MINUTES);
      expect(stalledAfterMinutes).toBe(STALLED_CADENCE_FACTOR * cadence + GRACE_MINUTES);
      expect(stalledAfterMinutes).toBeGreaterThan(warnAfterMinutes);
    }
  });

  it('rejeita cadência inválida', () => {
    for (const invalid of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => retentionThresholds(invalid)).toThrow(RangeError);
    }
  });
});

describe('classificação de saúde — varredura exaustiva', () => {
  it('é monotônica: mais silêncio nunca melhora o diagnóstico', () => {
    const rank: Record<RetentionHealth, number> = {
      ok: 0,
      pending_first_run: 1,
      warn: 2,
      stalled: 3,
      never: 4,
    };
    for (const cadence of CADENCES) {
      const { stalledAfterMinutes } = retentionThresholds(cadence);
      let previous = -1;
      for (
        let silence = 0;
        silence <= stalledAfterMinutes + cadence;
        silence += Math.max(1, Math.floor(cadence / 7))
      ) {
        const current = rank[classifyRetentionHealth(silence, cadence)];
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('acerta as fronteiras exatas de cada faixa', () => {
    for (const cadence of CADENCES) {
      const { warnAfterMinutes, stalledAfterMinutes } = retentionThresholds(cadence);
      expect(classifyRetentionHealth(warnAfterMinutes - 1, cadence)).toBe('ok');
      expect(classifyRetentionHealth(warnAfterMinutes, cadence)).toBe('warn');
      expect(classifyRetentionHealth(stalledAfterMinutes - 1, cadence)).toBe('warn');
      expect(classifyRetentionHealth(stalledAfterMinutes, cadence)).toBe('stalled');
    }
  });

  it('trata silêncio negativo (relógio adiantado) como zero', () => {
    for (const cadence of CADENCES) {
      for (const skew of [-1, -60, -100000]) {
        expect(classifyRetentionHealth(skew, cadence)).toBe('ok');
      }
    }
  });

  it('nunca executou é "never", independentemente da cadência', () => {
    for (const cadence of CADENCES) {
      expect(classifyRetentionHealth(null, cadence)).toBe('never');
    }
  });

  it('valores não finitos caem no pior caso', () => {
    for (const cadence of CADENCES) {
      expect(classifyRetentionHealth(Number.POSITIVE_INFINITY, cadence)).toBe('stalled');
      expect(classifyRetentionHealth(Number.NaN, cadence)).toBe('stalled');
    }
  });

  it('cobre a matriz completa cadência × silêncio sem lançar', () => {
    let evaluated = 0;
    for (const cadence of CADENCES) {
      for (let silence = 0; silence <= 20000; silence += 7) {
        const health = classifyRetentionHealth(silence, cadence);
        expect(['ok', 'warn', 'stalled']).toContain(health);
        evaluated += 1;
      }
    }
    expect(evaluated).toBeGreaterThan(25_000);
  });
});

describe('acionabilidade', () => {
  it('só exige ação humana em parada ou ausência total de execuções', () => {
    expect(isRetentionActionable('ok')).toBe(false);
    expect(isRetentionActionable('warn')).toBe(false);
    expect(isRetentionActionable('stalled')).toBe(true);
    expect(isRetentionActionable('never')).toBe(true);
  });
});

describe('Onda 244 — carência de estreia', () => {
  it('trata rotina recém-registrada sem execução como estreia pendente', () => {
    for (const cadence of CADENCES) {
      const { debutAfterMinutes } = retentionThresholds(cadence);
      expect(classifyRetentionHealth(null, cadence, 0)).toBe('pending_first_run');
      expect(classifyRetentionHealth(null, cadence, debutAfterMinutes - 1)).toBe(
        'pending_first_run'
      );
    }
  });

  it('volta a ser crítica assim que a carência vence', () => {
    for (const cadence of CADENCES) {
      const { debutAfterMinutes } = retentionThresholds(cadence);
      expect(classifyRetentionHealth(null, cadence, debutAfterMinutes)).toBe('never');
      expect(classifyRetentionHealth(null, cadence, debutAfterMinutes + 1)).toBe('never');
    }
  });

  it('sem âncora de registro legível, ausência de execução continua crítica', () => {
    for (const age of [null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(classifyRetentionHealth(null, 1440, age as number | null)).toBe('never');
    }
  });

  it('registro no futuro é saneado para zero, nunca vira silêncio infinito', () => {
    expect(classifyRetentionHealth(null, 1440, -50_000)).toBe('pending_first_run');
  });

  it('havendo execução, a idade de registro é irrelevante', () => {
    for (const cadence of CADENCES) {
      const { stalledAfterMinutes } = retentionThresholds(cadence);
      for (const silence of [0, stalledAfterMinutes + 1]) {
        for (const age of [null, 0, 10, 1_000_000]) {
          expect(classifyRetentionHealth(silence, cadence, age)).toBe(
            classifyRetentionHealth(silence, cadence, null)
          );
        }
      }
    }
  });

  it('estreia pendente nunca é acionável', () => {
    expect(isRetentionActionable('pending_first_run')).toBe(false);
  });
});
