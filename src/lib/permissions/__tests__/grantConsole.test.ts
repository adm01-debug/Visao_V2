import { describe, expect, it } from 'vitest';
import {
  MAX_GRANT_DAYS,
  evaluateGrantRequest,
  evaluateRevokeRequest,
  grantRowState,
  projectGrantEffect,
  remainingHours,
} from '../grantConsole';
import type { AppRole } from '../capabilities';

const NOW = Date.UTC(2026, 6, 27, 12, 0, 0);
const DAY = 86_400_000;

const base = (over: Partial<Parameters<typeof evaluateGrantRequest>[0]> = {}) => ({
  actorId: 'admin-1',
  actorRole: 'admin' as AppRole,
  actorGrants: [],
  targetId: 'user-2',
  targetRole: 'viewer' as AppRole,
  targetGrants: [],
  capability: 'cameras.ptz.control',
  effect: 'grant' as const,
  reason: 'tecnico terceirizado',
  expiresAtMs: NOW + 7 * DAY,
  ...over,
});

describe('grantConsole — admissão de concessões', () => {
  it('aprova concessão legítima com prazo dentro do teto', () => {
    expect(evaluateGrantRequest(base(), NOW).allowed).toBe(true);
  });

  it('recusa concessão sem prazo', () => {
    expect(evaluateGrantRequest(base({ expiresAtMs: null }), NOW).rejection).toBe('expiry_required');
  });

  it('aceita exatamente o teto e recusa um dia além', () => {
    expect(evaluateGrantRequest(base({ expiresAtMs: NOW + MAX_GRANT_DAYS * DAY }), NOW).allowed).toBe(true);
    expect(evaluateGrantRequest(base({ expiresAtMs: NOW + (MAX_GRANT_DAYS + 1) * DAY }), NOW).rejection)
      .toBe('expiry_too_far');
  });

  it('recusa auto-concessão mesmo para admin', () => {
    expect(evaluateGrantRequest(base({ targetId: 'admin-1' }), NOW).rejection).toBe('self_grant');
  });

  it('recusa escalada: conceder o que o ator não possui', () => {
    const req = base({
      actorRole: 'manager',
      actorGrants: [{ capability: 'users.grant_capability', effect: 'grant', expiresAtMs: NOW + DAY }],
      capability: 'recordings.delete',
    });
    expect(evaluateGrantRequest(req, NOW).rejection).toBe('escalation');
  });

  it('recusa concessão redundante com o piso do papel', () => {
    expect(evaluateGrantRequest(base({ capability: 'cameras.view' }), NOW).rejection).toBe('redundant_grant');
  });

  it('recusa negação inócua e o anti-lockout de admin', () => {
    expect(evaluateGrantRequest(base({ effect: 'deny', capability: 'recordings.delete' }), NOW).rejection)
      .toBe('ineffective_deny');
    expect(
      evaluateGrantRequest(
        base({ effect: 'deny', capability: 'users.grant_capability', targetId: 'admin-2', targetRole: 'admin' }),
        NOW,
      ).rejection,
    ).toBe('ineffective_deny');
  });

  it('recusa justificativa curta e capacidade órfã', () => {
    expect(evaluateGrantRequest(base({ reason: 'ok' }), NOW).rejection).toBe('reason_required');
    expect(evaluateGrantRequest(base({ capability: 'cameras.teleport' }), NOW).rejection).toBe('unknown_capability');
  });

  it('toda aprovação muda o conjunto efetivo do alvo', () => {
    const projection = projectGrantEffect(base(), NOW);
    expect(projection.changed).toBe(true);
    expect(projection.after.length).toBe(projection.before.length + 1);
  });

  it('revogação é idempotente e não escreve duas vezes', () => {
    const actor = { actorId: 'a', actorRole: 'admin' as AppRole, actorGrants: [], targetId: 'b' };
    expect(evaluateRevokeRequest({ ...actor, grantExists: true, alreadyRevoked: false }, NOW).noop).toBe(false);
    const second = evaluateRevokeRequest({ ...actor, grantExists: true, alreadyRevoked: true }, NOW);
    expect(second.allowed).toBe(true);
    expect(second.noop).toBe(true);
  });

  it('classifica o estado da linha pelo relógio injetado', () => {
    expect(grantRowState({ expiresAtMs: NOW + DAY }, NOW)).toBe('active');
    expect(grantRowState({ expiresAtMs: NOW }, NOW)).toBe('expired');
    expect(grantRowState({ expiresAtMs: NOW + DAY, revokedAtMs: NOW - 1 }, NOW)).toBe('revoked');
    expect(remainingHours(NOW + 3 * 3_600_000, NOW)).toBe(3);
    expect(remainingHours(NOW - 1, NOW)).toBe(0);
  });
});
