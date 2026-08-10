import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_HEALING_THRESHOLDS as T,
  computeDeafRatio,
  decideAgentHealing,
  evaluateAgentHealing,
  type AgentSnapshot,
} from '@/lib/agentHealing';

const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const MIN = 60_000;

function agent(overrides: Partial<AgentSnapshot> = {}): AgentSnapshot {
  return {
    id: 'agent-1',
    name: 'agente-sede',
    status: 'active',
    lastSeenAtMs: NOW - 1 * MIN,
    createdAtMs: NOW - 1000 * MIN,
    relay: { done: 0, failed: 0, expired: 0, pending: 0 },
    attempts: 0,
    lastAttemptAtMs: null,
    ...overrides,
  };
}

describe('computeDeafRatio', () => {
  it('retorna null com amostra insuficiente', () => {
    expect(computeDeafRatio({ done: 1, failed: 1, expired: 0, pending: 0 })).toBeNull();
  });

  it('ignora tarefas ainda pendentes no denominador', () => {
    expect(computeDeafRatio({ done: 5, failed: 5, expired: 0, pending: 99 })).toBe(0.5);
  });
});

describe('decideAgentHealing', () => {
  it('não age sobre agente revogado, mesmo mudo há dias', () => {
    const d = decideAgentHealing(agent({ status: 'revoked', lastSeenAtMs: NOW - 5000 * MIN }), NOW);
    expect(d.action).toBe('none');
    expect(d.severity).toBe('ok');
    expect(d.enqueue).toBe(false);
  });

  it('respeita a carência de instalação', () => {
    const d = decideAgentHealing(agent({ lastSeenAtMs: null, createdAtMs: NOW - 5 * MIN }), NOW);
    expect(d.action).toBe('none');
    expect(d.reason).toContain('carência');
  });

  it('trata agente que nunca bateu heartbeat após a carência como crítico', () => {
    const d = decideAgentHealing(agent({ lastSeenAtMs: null, createdAtMs: NOW - 60 * MIN }), NOW);
    expect(d.severity).toBe('critical');
    expect(d.action).toBe('nudge');
    expect(d.enqueue).toBe(true);
  });

  it('classifica heartbeat atrasado como warning e responde com nudge', () => {
    const d = decideAgentHealing(agent({ lastSeenAtMs: NOW - 12 * MIN }), NOW);
    expect(d.severity).toBe('warning');
    expect(d.action).toBe('nudge');
  });

  it('detecta agente vivo porém surdo pela fila de relay', () => {
    const d = decideAgentHealing(
      agent({ relay: { done: 2, failed: 3, expired: 5, pending: 0 } }),
      NOW
    );
    expect(d.severity).toBe('critical');
    expect(d.reason).toContain('expiraram/falharam');
  });

  it('escala para restart apenas após um nudge sem sucesso', () => {
    const stale = { lastSeenAtMs: NOW - 90 * MIN, lastAttemptAtMs: NOW - 60 * MIN };
    expect(decideAgentHealing(agent({ ...stale, attempts: 0 }), NOW).action).toBe('nudge');
    expect(decideAgentHealing(agent({ ...stale, attempts: 1 }), NOW).action).toBe('restart');
  });

  it('bloqueia nova tentativa dentro do cooldown', () => {
    const d = decideAgentHealing(
      agent({ lastSeenAtMs: NOW - 90 * MIN, attempts: 1, lastAttemptAtMs: NOW - 5 * MIN }),
      NOW
    );
    expect(d.action).toBe('none');
    expect(d.enqueue).toBe(false);
    expect(d.reason).toContain('cooldown');
  });

  it('escala para humano quando as tentativas se esgotam, sem enfileirar', () => {
    const d = decideAgentHealing(
      agent({
        lastSeenAtMs: NOW - 300 * MIN,
        attempts: T.maxAttempts,
        lastAttemptAtMs: NOW - 200 * MIN,
      }),
      NOW
    );
    expect(d.action).toBe('escalate');
    expect(d.enqueue).toBe(false);
    expect(d.severity).toBe('critical');
  });

  it('trata recuo de relógio (heartbeat no futuro) como recém-visto', () => {
    const d = decideAgentHealing(agent({ lastSeenAtMs: NOW + 120 * MIN }), NOW);
    expect(d.silentMinutes).toBe(0);
    expect(d.severity).toBe('ok');
  });
});

describe('evaluateAgentHealing', () => {
  it('resume a frota pela pior severidade', () => {
    const v = evaluateAgentHealing({
      nowMs: NOW,
      agents: [
        agent({ id: 'a' }),
        agent({ id: 'b', lastSeenAtMs: NOW - 12 * MIN }),
        agent({ id: 'c', lastSeenAtMs: NOW - 500 * MIN }),
      ],
    });
    expect(v.severity).toBe('critical');
    expect(v.detail.agents_total).toBe(3);
    expect(v.detail.agents_critical).toBe(1);
    expect(v.detail.agents_warning).toBe(1);
  });

  it('reporta frota saudável quando ninguém precisa de cura', () => {
    const v = evaluateAgentHealing({ nowMs: NOW, agents: [agent(), agent({ id: 'b' })] });
    expect(v.severity).toBe('ok');
    expect(v.reason).toContain('saudável');
    expect(v.detail.actions_enqueued).toBe(0);
  });
});
