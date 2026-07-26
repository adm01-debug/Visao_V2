/**
 * Onda 136 — varredura de cenários do console de manutenção.
 *
 * A simulação é combinatória: severidades × níveis × idades × estados de
 * reconhecimento × instantes do último degrau. O objetivo não é cobrir linhas,
 * é provar as invariantes I1..I6 documentadas em `maintenanceConsoleView.ts`.
 */

import { describe, expect, it } from 'vitest';
import {
  buildMaintenanceConsole,
  minutesToNextLevel,
  type MaintenanceAlertRow,
} from '@/lib/maintenance/maintenanceConsoleView';
import { DEFAULT_ESCALATION_THRESHOLDS } from '@/lib/maintenanceEscalation';

const NOW = Date.parse('2026-07-26T12:00:00.000Z');
const MINUTE = 60_000;

function row(overrides: Partial<MaintenanceAlertRow> & { id: string }): MaintenanceAlertRow {
  return {
    routine: 'retention:collab_entry_purge_runs',
    severity: 'critical',
    reason: 'rotina parada',
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

const SEVERITIES = ['critical', 'warning'] as const;
const LEVELS = [0, 1, 2, 3] as const;
const AGES = [0, 1, 29, 30, 119, 120, 359, 360, 1439, 1440, 5000] as const;
const LAST_STEPS = [null, 0, 5, 29, 30, 200] as const;

describe('buildMaintenanceConsole — varredura combinatória', () => {
  const cases: MaintenanceAlertRow[] = [];
  let seq = 0;
  for (const severity of SEVERITIES) {
    for (const level of LEVELS) {
      for (const age of AGES) {
        for (const lastStep of LAST_STEPS) {
          for (const acked of [false, true]) {
            seq += 1;
            cases.push(
              row({
                id: `alert-${String(seq).padStart(5, '0')}`,
                severity,
                escalation_level: level,
                created_at: new Date(NOW - age * MINUTE).toISOString(),
                last_escalated_at:
                  lastStep === null ? null : new Date(NOW - lastStep * MINUTE).toISOString(),
                acknowledged_at: acked ? new Date(NOW - MINUTE).toISOString() : null,
              }),
            );
          }
        }
      }
    }
  }

  const model = buildMaintenanceConsole(cases, NOW);

  it('cobre centenas de cenários', () => {
    expect(cases.length).toBeGreaterThan(500);
    expect(model.rows).toHaveLength(cases.length);
  });

  it('I1 — reconhecido não oferece ação nem previsão', () => {
    for (const view of model.rows) {
      if (view.status !== 'acknowledged') continue;
      expect(view.canAcknowledge).toBe(false);
      expect(view.minutesToNextLevel).toBeNull();
    }
  });

  it('I2 — alerta no teto da severidade não tem previsão', () => {
    for (const view of model.rows) {
      const ceiling = DEFAULT_ESCALATION_THRESHOLDS.maxLevel[view.severity];
      if (view.level >= ceiling) expect(view.minutesToNextLevel).toBeNull();
    }
  });

  it('I3 — previsão e idade nunca são negativas', () => {
    for (const view of model.rows) {
      expect(view.ageMinutes).toBeGreaterThanOrEqual(0);
      if (view.minutesToNextLevel !== null) {
        expect(view.minutesToNextLevel).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('I4 — envelhecer nunca aumenta a previsão do próximo degrau', () => {
    for (const severity of SEVERITIES) {
      for (const level of LEVELS) {
        let previous = Number.POSITIVE_INFINITY;
        for (const age of AGES) {
          const value = minutesToNextLevel(severity, level, age, null);
          if (value === null) continue;
          expect(value).toBeLessThanOrEqual(previous + 1e-9);
          previous = value;
        }
      }
    }
  });

  it('I5 — ordenação é determinística e independente da ordem de entrada', () => {
    const shuffled = [...cases].reverse();
    const other = buildMaintenanceConsole(shuffled, NOW);
    expect(other.rows.map((view) => view.id)).toEqual(model.rows.map((view) => view.id));

    // Abertos vêm sempre antes dos reconhecidos.
    const firstAcked = model.rows.findIndex((view) => view.status === 'acknowledged');
    if (firstAcked >= 0) {
      expect(model.rows.slice(firstAcked).every((view) => view.status === 'acknowledged')).toBe(
        true,
      );
    }
  });

  it('I6 — resumo bate com a classificação das linhas', () => {
    const open = model.rows.filter((view) => view.status === 'open');
    expect(model.summary.total).toBe(model.rows.length);
    expect(model.summary.open).toBe(open.length);
    expect(model.summary.openCritical).toBe(
      open.filter((view) => view.severity === 'critical').length,
    );
    expect(model.summary.openWarning).toBe(model.summary.open - model.summary.openCritical);
    expect(model.summary.acknowledged).toBe(model.rows.length - open.length);
  });
});

describe('casos de borda', () => {
  it('relógio recuado (created_at no futuro) zera a idade', () => {
    const model = buildMaintenanceConsole(
      [row({ id: 'a', created_at: new Date(NOW + 90 * MINUTE).toISOString() })],
      NOW,
    );
    expect(model.rows[0].ageMinutes).toBe(0);
  });

  it('severidade desconhecida é tratada como crítica', () => {
    const model = buildMaintenanceConsole([row({ id: 'a', severity: 'bogus' })], NOW);
    expect(model.rows[0].severity).toBe('critical');
  });

  it('data inválida não quebra o modelo', () => {
    const model = buildMaintenanceConsole([row({ id: 'a', created_at: 'nao-e-data' })], NOW);
    expect(model.rows[0].ageMinutes).toBe(0);
  });

  it('warning nunca prevê degrau para o plantão', () => {
    expect(minutesToNextLevel('warning', 2, 100_000, null)).toBeNull();
  });

  it('cooldown do último degrau domina quando a idade já basta', () => {
    // critical nível 0 → 1 exige 30 min de idade; com 500 min de idade e um
    // degrau há 5 min, o que segura é o minStepMinutes (30 - 5 = 25).
    expect(minutesToNextLevel('critical', 0, 500, 5)).toBe(25);
  });

  it('lista vazia produz resumo neutro', () => {
    const model = buildMaintenanceConsole([], NOW);
    expect(model.summary.worst).toBe('ok');
    expect(model.summary.total).toBe(0);
  });
});
