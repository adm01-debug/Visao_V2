import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ESCALATION_THRESHOLDS,
  evaluateAlertEscalation,
  evaluateEscalations,
  targetLevelForAge,
  type AlertSnapshot,
} from '@/lib/maintenanceEscalation';

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const MIN = 60_000;

const DELIVERED = { delivered: true, failedChannels: 0, neverAttempted: false } as const;
const UNDELIVERED = { delivered: false, failedChannels: 2, neverAttempted: false } as const;

function alert(overrides: Partial<AlertSnapshot> = {}): AlertSnapshot {
  return {
    id: 'a1',
    routine: 'partition_drain',
    severity: 'critical',
    reason: 'drenagem falhou',
    createdAtMs: NOW - 10 * MIN,
    acknowledgedAtMs: null,
    escalationLevel: 0,
    lastEscalatedAtMs: null,
    dispatch: DELIVERED,
    ...overrides,
  };
}

describe('maintenanceEscalation — escada de urgência', () => {
  it('não escala alerta recém-criado e entregue', () => {
    const d = evaluateAlertEscalation(alert(), NOW);
    expect(d.shouldEscalate).toBe(false);
    expect(d.toLevel).toBe(0);
  });

  it('sobe para lembrete após 30 min de silêncio em alerta crítico', () => {
    const d = evaluateAlertEscalation(alert({ createdAtMs: NOW - 31 * MIN }), NOW);
    expect(d.shouldEscalate).toBe(true);
    expect(d.toLevel).toBe(1);
    expect(d.emitsAlert).toBe(false);
  });

  it('congela a escada quando o alerta é reconhecido, mesmo muito antigo', () => {
    const d = evaluateAlertEscalation(
      alert({ createdAtMs: NOW - 5000 * MIN, acknowledgedAtMs: NOW - MIN }),
      NOW,
    );
    expect(d.shouldEscalate).toBe(false);
    expect(d.reason).toContain('reconhecido');
  });

  it('sobe no máximo um degrau por avaliação, mesmo em alerta antiquíssimo', () => {
    const d = evaluateAlertEscalation(alert({ createdAtMs: NOW - 43200 * MIN }), NOW);
    expect(d.toLevel).toBe(1);
  });

  it('respeita o intervalo mínimo entre degraus', () => {
    const d = evaluateAlertEscalation(
      alert({ createdAtMs: NOW - 200 * MIN, escalationLevel: 1, lastEscalatedAtMs: NOW - 5 * MIN }),
      NOW,
    );
    expect(d.shouldEscalate).toBe(false);
    expect(d.reason).toContain('intervalo mínimo');
  });

  it('emite alerta no barramento ao chegar no nível 2', () => {
    const d = evaluateAlertEscalation(
      alert({ createdAtMs: NOW - 200 * MIN, escalationLevel: 1, lastEscalatedAtMs: NOW - 60 * MIN }),
      NOW,
    );
    expect(d.toLevel).toBe(2);
    expect(d.emitsAlert).toBe(true);
  });

  it('acelera o primeiro degrau quando nenhum canal entregou', () => {
    const aged = alert({ createdAtMs: NOW - 80 * MIN, dispatch: UNDELIVERED });
    expect(targetLevelForAge('warning', 80, UNDELIVERED)).toBe(1);
    // Entregue, um warning de 80 min ainda não justificaria degrau algum.
    expect(targetLevelForAge('warning', 80, DELIVERED)).toBe(0);
    expect(evaluateAlertEscalation({ ...aged, severity: 'warning' }, NOW).toLevel).toBe(1);
  });

  it('nunca leva um warning ao plantão', () => {
    expect(targetLevelForAge('warning', 100000, DELIVERED)).toBe(2);
    expect(DEFAULT_ESCALATION_THRESHOLDS.maxLevel.warning).toBe(2);
  });

  it('não escala alerta com data no futuro (relógio recuado)', () => {
    const d = evaluateAlertEscalation(alert({ createdAtMs: NOW + 500 * MIN }), NOW);
    expect(d.shouldEscalate).toBe(false);
    expect(d.ageMinutes).toBe(0);
  });

  it('nunca reduz o nível já alcançado', () => {
    const d = evaluateAlertEscalation(alert({ createdAtMs: NOW - MIN, escalationLevel: 2 }), NOW);
    expect(d.toLevel).toBe(2);
    expect(d.shouldEscalate).toBe(false);
  });

  it('é idempotente após aplicar o degrau', () => {
    const first = evaluateAlertEscalation(alert({ createdAtMs: NOW - 31 * MIN }), NOW);
    const applied = alert({
      createdAtMs: NOW - 31 * MIN,
      escalationLevel: first.toLevel,
      lastEscalatedAtMs: NOW,
    });
    expect(evaluateAlertEscalation(applied, NOW).shouldEscalate).toBe(false);
  });
});

describe('maintenanceEscalation — veredito agregado', () => {
  it('devolve ok quando não há alertas abertos', () => {
    const v = evaluateEscalations({ nowMs: NOW, alerts: [] });
    expect(v.severity).toBe('ok');
    expect(v.pending).toHaveLength(0);
  });

  it('classifica como crítico quando algum alerta chega ao nível 2', () => {
    const v = evaluateEscalations({
      nowMs: NOW,
      alerts: [alert({ createdAtMs: NOW - 200 * MIN, escalationLevel: 1, lastEscalatedAtMs: NOW - 60 * MIN })],
    });
    expect(v.severity).toBe('critical');
    expect(v.pending).toHaveLength(1);
  });

  it('classifica como aviso quando há apenas alerta sem entrega confirmada', () => {
    const v = evaluateEscalations({
      nowMs: NOW,
      alerts: [alert({ createdAtMs: NOW - 5 * MIN, dispatch: UNDELIVERED })],
    });
    expect(v.severity).toBe('warning');
  });

  it('não conta alertas reconhecidos como pendentes', () => {
    const v = evaluateEscalations({
      nowMs: NOW,
      alerts: [alert({ createdAtMs: NOW - 5000 * MIN, acknowledgedAtMs: NOW })],
    });
    expect(v.severity).toBe('ok');
    expect(v.detail).toMatchObject({ acknowledged: 1 });
  });
});
