import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RESTART_BUDGET_POLICY as POLICY,
  evaluateBreaker,
  jitterSecondsFor,
  perRunBudget,
  planAgentAdmission,
  stableHash32,
  windowRemaining,
  type AdmissionCandidate,
} from '@/lib/agentRestartBudget';

function candidate(id: string, overrides: Partial<AdmissionCandidate> = {}): AdmissionCandidate {
  return {
    agentId: id,
    agentName: `agente ${id}`,
    action: 'restart',
    severity: 'critical',
    silentMinutes: 60,
    attempts: 1,
    ...overrides,
  };
}

const many = (n: number, overrides: Partial<AdmissionCandidate> = {}) =>
  Array.from({ length: n }, (_, i) => candidate(`agente-${i}`, overrides));

describe('perRunBudget', () => {
  it('é proporcional à frota, com piso e teto', () => {
    expect(perRunBudget(0, POLICY)).toBe(0);
    expect(perRunBudget(1, POLICY)).toBe(1); // piso protege frota minúscula
    expect(perRunBudget(20, POLICY)).toBe(3);
    expect(perRunBudget(60, POLICY)).toBe(5); // teto absoluto
    expect(perRunBudget(5000, POLICY)).toBe(POLICY.maxRestartsPerRun);
  });
});

describe('windowRemaining', () => {
  it('desconta os reinícios já feitos e nunca fica negativo', () => {
    expect(windowRemaining(60, 0, POLICY)).toBe(12);
    expect(windowRemaining(60, 5, POLICY)).toBe(7);
    expect(windowRemaining(60, 999, POLICY)).toBe(0);
  });
});

describe('evaluateBreaker', () => {
  it('não arma em frota pequena, onde a fração é ruído', () => {
    const verdict = evaluateBreaker(3, many(3), POLICY);
    expect(verdict.tripped).toBe(false);
  });

  it('não arma com poucos agentes afetados', () => {
    expect(evaluateBreaker(4, many(2), POLICY).tripped).toBe(false);
  });

  it('arma quando fração relevante da frota adoece junta', () => {
    const verdict = evaluateBreaker(20, many(12), POLICY);
    expect(verdict.tripped).toBe(true);
    expect(verdict.reason).toMatch(/ambiente/);
  });

  it('não arma na degradação gradual de uma frota grande', () => {
    expect(evaluateBreaker(60, many(6), POLICY).tripped).toBe(false);
  });
});

describe('planAgentAdmission', () => {
  it('cura um agente isolado sem alarde', () => {
    const plan = planAgentAdmission({ fleetSize: 60, candidates: many(1), restartsInWindow: 0 });
    expect(plan.admittedRestarts).toBe(1);
    expect(plan.breaker.tripped).toBe(false);
    expect(plan.alert).toBeNull();
  });

  it('suprime todos os reinícios quando a frota cai junta e alerta como crítico', () => {
    const plan = planAgentAdmission({ fleetSize: 20, candidates: many(14), restartsInWindow: 0 });
    expect(plan.breaker.tripped).toBe(true);
    expect(plan.admittedRestarts).toBe(0);
    expect(plan.suppressedRestarts).toBe(14);
    expect(plan.alert?.severity).toBe('critical');
  });

  it('adia o excedente do orçamento e sinaliza como aviso', () => {
    const plan = planAgentAdmission({ fleetSize: 60, candidates: many(8), restartsInWindow: 0 });
    expect(plan.admittedRestarts).toBe(5);
    expect(plan.deferredRestarts).toBe(3);
    expect(plan.alert?.severity).toBe('warning');
  });

  it('não bloqueia ping nem escalonamento com o disjuntor armado', () => {
    const plan = planAgentAdmission({
      fleetSize: 20,
      candidates: [
        ...many(12),
        candidate('ping-1', { action: 'nudge', severity: 'warning' }),
        candidate('esc-1', { action: 'escalate' }),
      ],
      restartsInWindow: 0,
    });
    expect(plan.breaker.tripped).toBe(true);
    const cheap = plan.decisions.filter((d) => d.action !== 'restart');
    expect(cheap).toHaveLength(2);
    expect(cheap.every((d) => d.outcome === 'admitted')).toBe(true);
  });

  it('respeita o teto da janela deslizante mesmo sem disjuntor', () => {
    const plan = planAgentAdmission({ fleetSize: 60, candidates: many(3), restartsInWindow: 12 });
    expect(plan.windowRemaining).toBe(0);
    expect(plan.admittedRestarts).toBe(0);
    expect(plan.deferredRestarts).toBe(3);
  });

  it('prioriza os casos mais graves', () => {
    const plan = planAgentAdmission({
      fleetSize: 12,
      candidates: [
        candidate('leve', { severity: 'warning', silentMinutes: 12, attempts: 1 }),
        candidate('grave', { severity: 'critical', silentMinutes: 300, attempts: 2 }),
      ],
      restartsInWindow: 0,
      policy: { ...POLICY, maxRestartsPerRun: 1 },
    });
    const admitted = plan.decisions.filter((d) => d.outcome === 'admitted');
    expect(admitted).toHaveLength(1);
    expect(admitted[0].agentId).toBe('grave');
  });

  it('nunca deixa uma decisão sem motivo legível', () => {
    const plan = planAgentAdmission({ fleetSize: 20, candidates: many(14), restartsInWindow: 3 });
    expect(plan.decisions.every((d) => d.reason.length > 10)).toBe(true);
  });

  it('é determinístico sob permutação da entrada', () => {
    const candidates = many(9);
    const a = planAgentAdmission({ fleetSize: 40, candidates, restartsInWindow: 0 });
    const b = planAgentAdmission({
      fleetSize: 40,
      candidates: [...candidates].reverse(),
      restartsInWindow: 0,
    });
    expect(a.admittedRestarts).toBe(b.admittedRestarts);
    const ids = (p: typeof a) =>
      p.decisions
        .filter((d) => d.outcome === 'admitted')
        .map((d) => d.agentId)
        .sort();
    expect(ids(a)).toEqual(ids(b));
  });
});

describe('jitter', () => {
  it('é estável por agente e cabe no intervalo do cron', () => {
    const first = jitterSecondsFor('agente-x', POLICY);
    expect(jitterSecondsFor('agente-x', POLICY)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(POLICY.jitterSpreadSeconds);
  });

  it('espalha agentes diferentes por instantes diferentes', () => {
    const values = new Set(
      Array.from({ length: 50 }, (_, i) => jitterSecondsFor(`agente-${i}`, POLICY))
    );
    expect(values.size).toBeGreaterThan(40);
  });

  it('usa hash de 32 bits estável', () => {
    expect(stableHash32('mesma')).toBe(stableHash32('mesma'));
    expect(stableHash32('a')).not.toBe(stableHash32('b'));
    expect(stableHash32('')).toBe(0x811c9dc5);
  });
});
