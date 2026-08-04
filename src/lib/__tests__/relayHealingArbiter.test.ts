import { describe, expect, it } from 'vitest';

import { arbitrate, type ArbiterFacts } from '../relayHealingArbiter';

const facts = (over: Partial<ArbiterFacts> = {}): ArbiterFacts => ({
  agentId: 'agent-1',
  healingAction: 'none',
  healingSeverity: 'ok',
  redeliverySeverity: 'none',
  deliveries: 0,
  externalRootCause: false,
  ...over,
});

describe('arbitrate — Onda 123', () => {
  it('mantém a escalada: caso esgotado é humano, não algorítmico (R0)', () => {
    const v = arbitrate(
      facts({ healingAction: 'escalate', healingSeverity: 'critical', externalRootCause: true })
    );
    expect(v.action).toBe('escalate');
    expect(v.overridden).toBe(false);
  });

  it('veta reinício quando o ambiente já é o culpado (R1, G2)', () => {
    const v = arbitrate(
      facts({ healingAction: 'restart', healingSeverity: 'critical', externalRootCause: true })
    );
    expect(v.action).toBe('observe');
    expect(v.overridden).toBe(true);
  });

  it('preserva ações não invasivas sob causa externa', () => {
    const v = arbitrate(
      facts({ healingAction: 'nudge', healingSeverity: 'warning', externalRootCause: true })
    );
    expect(v.action).toBe('nudge');
    expect(v.overridden).toBe(false);
  });

  it('rebaixa reinício a sondagem diante de prova de vida (R2)', () => {
    const v = arbitrate(
      facts({ healingAction: 'restart', healingSeverity: 'warning', deliveries: 4 })
    );
    expect(v.action).toBe('nudge');
    expect(v.reason).toContain('4');
  });

  it('não rebaixa reinício quando a severidade é crítica', () => {
    expect(
      arbitrate(facts({ healingAction: 'restart', healingSeverity: 'critical', deliveries: 9 }))
        .action
    ).toBe('restart');
  });

  it('enxerga o agente meia-boca que a escada não vê (R3, G1)', () => {
    const v = arbitrate(facts({ redeliverySeverity: 'critical' }));
    expect(v.action).toBe('observe');
    expect(v.severity).toBe('critical');
  });

  it('severidade final é o máximo entre escada e reentrega', () => {
    expect(
      arbitrate(
        facts({
          healingAction: 'nudge',
          healingSeverity: 'warning',
          redeliverySeverity: 'critical',
        })
      ).severity
    ).toBe('critical');
    expect(
      arbitrate(
        facts({
          healingAction: 'nudge',
          healingSeverity: 'critical',
          redeliverySeverity: 'warning',
        })
      ).severity
    ).toBe('critical');
  });

  it('silêncio permanece silêncio quando nada acusa o agente', () => {
    const v = arbitrate(facts());
    expect(v.action).toBe('none');
    expect(v.overridden).toBe(false);
  });

  it('nunca escala a invasividade acima da decisão da escada', () => {
    const rank = { none: 0, observe: 1, nudge: 2, restart: 3, escalate: 4 } as const;
    for (const a of ['none', 'nudge', 'restart', 'escalate'] as const)
      for (const s of ['ok', 'warning', 'critical'] as const)
        for (const r of ['none', 'warning', 'critical'] as const)
          for (const d of [0, 3])
            for (const e of [false, true]) {
              const v = arbitrate(
                facts({
                  healingAction: a,
                  healingSeverity: s,
                  redeliverySeverity: r,
                  deliveries: d,
                  externalRootCause: e,
                })
              );
              expect(rank[v.action]).toBeLessThanOrEqual(Math.max(rank[a], rank.observe));
            }
  });

  it('é uma função pura do estado', () => {
    const f = facts({ healingAction: 'restart', healingSeverity: 'warning', deliveries: 2 });
    expect(arbitrate(f)).toEqual(arbitrate(f));
  });
});
