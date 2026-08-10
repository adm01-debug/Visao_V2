import { describe, expect, it } from 'vitest';
import {
  CONNECTIVITY_PATHS,
  DEFAULT_FAILOVER_POLICY,
  EMPTY_EVIDENCE,
  applyAttempt,
  blamesPath,
  planFailover,
  quarantineBackoffMs,
  type PathEvidence,
} from '../pathFailover';

const NOW = 1_800_000_000_000;
const ev = (over: Partial<PathEvidence> = {}): PathEvidence => ({ ...EMPTY_EVIDENCE, ...over });

describe('pathFailover — ordenação de caminhos', () => {
  it('mantém o preferido saudável na frente e devolve permutação completa', () => {
    const plan = planFailover(
      { preferredPath: 'relay', configuredPaths: CONNECTIVITY_PATHS, evidence: {} },
      NOW
    );
    expect(plan.order[0]).toBe('relay');
    expect(plan.reason).toBe('preferred_healthy');
    expect(new Set(plan.order).size).toBe(CONNECTIVITY_PATHS.length);
  });

  it('rebaixa o preferido em quarentena sem removê-lo da lista', () => {
    const plan = planFailover(
      {
        preferredPath: 'direct',
        configuredPaths: ['direct', 'relay'],
        evidence: {
          direct: ev({
            attempts: 5,
            consecutiveTransportFailures: 4,
            lastTransportFailureAtMs: NOW - 1_000,
          }),
        },
      },
      NOW
    );
    expect(plan.order).toEqual(['relay', 'direct']);
    expect(plan.reason).toBe('preferred_quarantined');
  });

  it('devolve o preferido quando a quarentena vence', () => {
    const evidence = {
      direct: ev({
        attempts: 5,
        consecutiveTransportFailures: 3,
        lastTransportFailureAtMs: NOW - 600_000,
      }),
    };
    expect(
      planFailover({ preferredPath: 'direct', configuredPaths: ['direct', 'relay'], evidence }, NOW)
        .order[0]
    ).toBe('direct');
  });

  it('nunca fica sem rota: caminho único em quarentena continua sendo tentado', () => {
    const plan = planFailover(
      {
        preferredPath: 'relay',
        configuredPaths: ['relay'],
        evidence: {
          relay: ev({
            attempts: 9,
            consecutiveTransportFailures: 8,
            lastTransportFailureAtMs: NOW,
          }),
        },
      },
      NOW
    );
    expect(plan.order).toEqual(['relay']);
  });

  it('exige amostra e margem para promover uma alternativa', () => {
    const weak = planFailover(
      {
        preferredPath: 'vpn',
        configuredPaths: ['vpn', 'direct'],
        evidence: {
          vpn: ev({ attempts: 100, successes: 70 }),
          direct: ev({ attempts: 3, successes: 3 }),
        },
      },
      NOW
    );
    expect(weak.order[0]).toBe('vpn');

    const strong = planFailover(
      {
        preferredPath: 'vpn',
        configuredPaths: ['vpn', 'direct'],
        evidence: {
          vpn: ev({ attempts: 100, successes: 40 }),
          direct: ev({ attempts: 100, successes: 98 }),
        },
      },
      NOW
    );
    expect(strong.order[0]).toBe('direct');
    expect(strong.reason).toBe('promoted_by_evidence');
  });

  it('ignora entrada suja e caminho não configurado', () => {
    const plan = planFailover(
      { preferredPath: 'vpn', configuredPaths: ['relay', 'relay', 'direct'], evidence: {} },
      NOW
    );
    expect(plan.order).toHaveLength(2);
    expect(plan.reason).toBe('preferred_not_configured');
    expect(
      planFailover({ preferredPath: 'vpn', configuredPaths: [], evidence: {} }, NOW).reason
    ).toBe('no_path_configured');
  });
});

describe('pathFailover — culpa e recuo', () => {
  it('só falha de transporte culpa o caminho', () => {
    expect(blamesPath('transport')).toBe(true);
    for (const kind of ['auth', 'config', 'device', 'none'] as const) {
      expect(blamesPath(kind)).toBe(false);
    }
  });

  it('senha errada não coloca a frota inteira em quarentena', () => {
    let evidence = ev();
    for (let i = 0; i < 25; i += 1) {
      evidence = applyAttempt(evidence, { succeeded: false, failureKind: 'auth' }, NOW + i);
    }
    expect(evidence.consecutiveTransportFailures).toBe(0);
    const plan = planFailover(
      {
        preferredPath: 'direct',
        configuredPaths: ['direct', 'relay'],
        evidence: { direct: evidence },
      },
      NOW + 1_000
    );
    expect(plan.order[0]).toBe('direct');
    expect(plan.decisions.every((d) => !d.quarantined)).toBe(true);
  });

  it('sucesso zera o contador de quarentena', () => {
    const failed = applyAttempt(ev({ consecutiveTransportFailures: 7 }), { succeeded: false }, NOW);
    expect(failed.consecutiveTransportFailures).toBe(8);
    expect(applyAttempt(failed, { succeeded: true }, NOW).consecutiveTransportFailures).toBe(0);
  });

  it('recuo é monotônico, zero abaixo do limiar e limitado pelo teto', () => {
    const { quarantineThreshold, backoffBaseMs, backoffCeilingMs } = DEFAULT_FAILOVER_POLICY;
    expect(quarantineBackoffMs(quarantineThreshold - 1)).toBe(0);
    expect(quarantineBackoffMs(quarantineThreshold)).toBe(backoffBaseMs);
    let previous = 0;
    for (let n = 0; n <= 60; n += 1) {
      const current = quarantineBackoffMs(n);
      expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeLessThanOrEqual(backoffCeilingMs);
      previous = current;
    }
    expect(quarantineBackoffMs(999)).toBe(backoffCeilingMs);
  });
});
