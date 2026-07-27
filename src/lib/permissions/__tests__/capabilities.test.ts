import { describe, expect, it } from 'vitest';
import {
  ADMIN_LOCKOUT_GUARD,
  CAPABILITIES,
  ROLE_BASELINE,
  hasCapability,
  isGrantActive,
  isKnownCapability,
  listCapabilities,
  resolveCapabilities,
  type AppRole,
  type CapabilityGrant,
} from '@/lib/permissions/capabilities';

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const HOUR = 3_600_000;
const ROLES: AppRole[] = ['viewer', 'operator', 'manager', 'admin'];

const grant = (over: Partial<CapabilityGrant> = {}): CapabilityGrant => ({
  capability: 'cameras.ptz.control',
  effect: 'grant',
  expiresAtMs: null,
  ...over,
});

describe('capabilities — piso dos papéis', () => {
  it('C2: o piso é monotônico na hierarquia', () => {
    for (let i = 1; i < ROLES.length; i += 1) {
      const lower = ROLE_BASELINE[ROLES[i - 1]];
      const higher = ROLE_BASELINE[ROLES[i]];
      expect(lower.every((c) => higher.includes(c))).toBe(true);
    }
  });

  it('C7: todo papel resolve mesmo sem concessão', () => {
    for (const role of ROLES) {
      const effective = resolveCapabilities(role, [], NOW);
      expect(listCapabilities(effective)).toEqual([...ROLE_BASELINE[role]].sort());
    }
  });

  it('admin cobre o catálogo inteiro', () => {
    expect([...ROLE_BASELINE.admin].sort()).toEqual([...CAPABILITIES].sort());
  });
});

describe('capabilities — deltas nominais', () => {
  it('concede capacidade fora do piso do papel', () => {
    const effective = resolveCapabilities('viewer', [grant({ expiresAtMs: NOW + HOUR })], NOW);
    expect(hasCapability(effective, 'cameras.ptz.control')).toBe(true);
    expect(effective.addedByGrant).toEqual(['cameras.ptz.control']);
  });

  it('C3: negação vence concessão da mesma capacidade', () => {
    const effective = resolveCapabilities('manager', [
      grant({ capability: 'recordings.delete', effect: 'grant' }),
      grant({ capability: 'recordings.delete', effect: 'deny' }),
    ], NOW);
    expect(hasCapability(effective, 'recordings.delete')).toBe(false);
  });

  it('remove capacidade do piso e relata o delta', () => {
    const effective = resolveCapabilities('manager', [
      grant({ capability: 'alerts.dispatch', effect: 'deny' }),
    ], NOW);
    expect(hasCapability(effective, 'alerts.dispatch')).toBe(false);
    expect(effective.removedByDeny).toEqual(['alerts.dispatch']);
  });
});

describe('capabilities — tempo', () => {
  it('C4: prazo vencido é inerte (e o limite é fechado no instante exato)', () => {
    expect(isGrantActive(grant({ expiresAtMs: NOW }), NOW)).toBe(false);
    expect(isGrantActive(grant({ expiresAtMs: NOW + 1 }), NOW)).toBe(true);

    const expired = resolveCapabilities('viewer', [grant({ expiresAtMs: NOW - HOUR })], NOW);
    expect(hasCapability(expired, 'cameras.ptz.control')).toBe(false);
    expect(expired.ignored).toHaveLength(1);
  });

  it('C4: concessão revogada é inerte', () => {
    const revoked = resolveCapabilities('viewer', [grant({ revokedAtMs: NOW - 1 })], NOW);
    expect(hasCapability(revoked, 'cameras.ptz.control')).toBe(false);
  });

  it('negação revogada devolve a capacidade do piso', () => {
    const effective = resolveCapabilities('manager', [
      grant({ capability: 'alerts.dispatch', effect: 'deny', revokedAtMs: NOW - HOUR }),
    ], NOW);
    expect(hasCapability(effective, 'alerts.dispatch')).toBe(true);
  });
});

describe('capabilities — bordas', () => {
  it('C1: capacidade fora do catálogo nunca entra no conjunto', () => {
    expect(isKnownCapability('cameras.self_destruct')).toBe(false);
    const effective = resolveCapabilities('viewer', [grant({ capability: 'cameras.self_destruct' })], NOW);
    expect(listCapabilities(effective)).toEqual([...ROLE_BASELINE.viewer].sort());
    expect(effective.ignored).toHaveLength(1);
  });

  it('C5: admin nunca perde a permissão de conceder permissões', () => {
    const denyEverything = CAPABILITIES.map((capability) =>
      grant({ capability, effect: 'deny' }),
    );
    const effective = resolveCapabilities('admin', denyEverything, NOW);
    for (const guarded of ADMIN_LOCKOUT_GUARD) {
      expect(hasCapability(effective, guarded)).toBe(true);
    }
    expect(hasCapability(effective, 'recordings.delete')).toBe(false);
  });

  it('C6: a ordem das concessões não altera o resultado', () => {
    const grants = [
      grant({ capability: 'audit.view', effect: 'grant' }),
      grant({ capability: 'recordings.delete', effect: 'deny' }),
      grant({ capability: 'recordings.delete', effect: 'grant' }),
      grant({ capability: 'users.view', effect: 'grant', expiresAtMs: NOW - 1 }),
    ];
    const direct = listCapabilities(resolveCapabilities('operator', grants, NOW));
    const reversed = listCapabilities(resolveCapabilities('operator', [...grants].reverse(), NOW));
    expect(direct).toEqual(reversed);
  });

  it('concessões duplicadas são idempotentes', () => {
    const grants = Array.from({ length: 20 }, () => grant({ capability: 'audit.view' }));
    const effective = resolveCapabilities('viewer', grants, NOW);
    expect(effective.addedByGrant).toEqual(['audit.view']);
  });
});
