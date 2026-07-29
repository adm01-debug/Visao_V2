import { describe, it, expect } from 'vitest';

import {
  escalationAckGate,
  escalationAckLabel,
} from '../escalationAckGate.ts';
import { evaluateAlertEscalation, type AlertSnapshot } from '../../maintenanceEscalation.ts';

const MIN = 60_000;
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);

const ack = (over: Record<string, unknown> = {}) => ({
  acknowledgedBy: 'operador@visao.test',
  severityAtAck: 'critical' as const,
  conditionPersists: true,
  ...over,
});

describe('Onda 249 — portão de reconhecimento da escada', () => {
  it('Y1 — congela dentro da janela e decai depois dela', () => {
    const fresh = escalationAckGate(
      { acknowledgedAtMs: NOW - 10 * MIN, severityNow: 'critical', ack: ack() },
      NOW,
    );
    expect(fresh.state).toBe('pending');
    expect(fresh.freezesLadder).toBe(true);

    const old = escalationAckGate(
      { acknowledgedAtMs: NOW - 200 * MIN, severityNow: 'critical', ack: ack() },
      NOW,
    );
    expect(old.state).toBe('expired');
    expect(old.freezesLadder).toBe(false);
    expect(old.decayed).toBe(true);
  });

  it('Y3 — condição resolvida honra o ack para sempre', () => {
    const v = escalationAckGate(
      {
        acknowledgedAtMs: NOW - 100_000 * MIN,
        severityNow: 'critical',
        ack: ack({ conditionPersists: false }),
      },
      NOW,
    );
    expect(v.state).toBe('honored');
    expect(v.freezesLadder).toBe(true);
  });

  it('Y4 — agravamento fura o congelamento na hora', () => {
    const v = escalationAckGate(
      {
        acknowledgedAtMs: NOW - 1 * MIN,
        severityNow: 'critical',
        ack: ack({ severityAtAck: 'warning' }),
      },
      NOW,
    );
    expect(v.state).toBe('void_aggravated');
    expect(v.freezesLadder).toBe(false);
  });

  it('Y5 — ack sem autor nunca congela', () => {
    const v = escalationAckGate(
      { acknowledgedAtMs: NOW - 1 * MIN, severityNow: 'warning', ack: ack({ acknowledgedBy: '  ' }) },
      NOW,
    );
    expect(v.state).toBe('void_unattributed');
    expect(v.freezesLadder).toBe(false);
  });

  it('Y8 — só promessa viva corta a série da condição', () => {
    const live = escalationAckGate(
      { acknowledgedAtMs: NOW - 5 * MIN, severityNow: 'critical', ack: ack() },
      NOW,
    );
    const dead = escalationAckGate(
      { acknowledgedAtMs: NOW - 5000 * MIN, severityNow: 'critical', ack: ack() },
      NOW,
    );
    expect(live.cutsStreak).toBe(true);
    expect(dead.cutsStreak).toBe(false);
  });

  it('Y9 — condição não medida nunca honra o ack', () => {
    const v = escalationAckGate(
      {
        acknowledgedAtMs: NOW - 5000 * MIN,
        severityNow: 'critical',
        ack: ack({ conditionPersists: null }),
      },
      NOW,
    );
    expect(v.state).toBe('expired');
  });

  it('Y10 — todo estado tem rótulo legível', () => {
    for (const v of [
      escalationAckGate({ acknowledgedAtMs: null, severityNow: 'warning' }, NOW),
      escalationAckGate({ acknowledgedAtMs: NOW, severityNow: 'warning', ack: ack() }, NOW),
    ]) {
      expect(escalationAckLabel(v).length).toBeGreaterThan(0);
    }
  });
});

describe('Onda 249 — escada com decaimento', () => {
  const base: AlertSnapshot = {
    id: 'a1',
    routine: 'agent_healing',
    severity: 'critical',
    reason: 'sim',
    createdAtMs: NOW - 5000 * MIN,
    acknowledgedAtMs: null,
    escalationLevel: 1,
    lastEscalatedAtMs: NOW - 5000 * MIN,
    dispatch: { delivered: false, failedChannels: 1, neverAttempted: false },
  };

  it('Y1/Y2 — ack vencido devolve o alerta à escada, sem rebaixar o degrau', () => {
    const d = evaluateAlertEscalation(
      { ...base, acknowledgedAtMs: NOW - 5000 * MIN, ack: ack() },
      NOW,
    );
    expect(d.fromLevel).toBe(1);
    expect(d.shouldEscalate).toBe(true);
    expect(d.toLevel).toBe(2);
  });

  it('promessa viva mantém a escada congelada', () => {
    const d = evaluateAlertEscalation({ ...base, acknowledgedAtMs: NOW - 5 * MIN, ack: ack() }, NOW);
    expect(d.shouldEscalate).toBe(false);
    expect(d.toLevel).toBe(1);
  });
});
