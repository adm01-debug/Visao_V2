import { describe, expect, it } from 'vitest';
import {
  COLLAB_GOVERNANCE_POLICY as P,
  canTransitionInvite,
  canTransitionMembership,
  effectiveInviteStatus,
  evaluateInvite,
  evaluateMembershipChange,
  evaluateRespond,
  isTerminalInviteStatus,
  membershipIsOperational,
  shouldRevokeEntriesOnChange,
  type GovernanceAction,
  type InviteStatus,
  type MembershipStatus,
} from '@/lib/collab/collabGovernance';

const INVITE_STATUSES: InviteStatus[] = ['pending', 'accepted', 'declined', 'revoked', 'expired'];
const MEMBERSHIPS: (MembershipStatus | null)[] = ['pending', 'active', 'suspended', null];

const baseInvite = {
  isNetworkOwner: true,
  targetIsOwner: false,
  existingMembership: null,
  hasPendingInvite: false,
  networkPendingCount: 0,
  orgPendingCount: 0,
  secondsSinceDecline: null,
  secondsSinceRevoke: null,
  ttlDays: null,
} as const;

describe('governança da rede colaborativa — emissão de convite', () => {
  it('aceita o caminho feliz com o TTL padrão', () => {
    expect(evaluateInvite(baseInvite)).toEqual({ allowed: true, reason: null });
  });

  it('exige autoridade antes de qualquer outra crítica', () => {
    const decision = evaluateInvite({
      ...baseInvite,
      isNetworkOwner: false,
      ttlDays: 9999,
      networkPendingCount: 10_000,
    });
    expect(decision.reason).toBe('not_network_owner');
  });

  it('recusa convidar a própria dona da rede', () => {
    expect(evaluateInvite({ ...baseInvite, targetIsOwner: true }).reason).toBe('target_is_owner');
  });

  it.each(['active', 'suspended'] as const)('não reconvida quem já participa (%s)', (status) => {
    expect(evaluateInvite({ ...baseInvite, existingMembership: status }).reason).toBe(
      'already_member',
    );
  });

  it.each([0, -1, 61, 1.5, Number.NaN])('recusa TTL fora da faixa (%s)', (ttl) => {
    expect(evaluateInvite({ ...baseInvite, ttlDays: ttl }).reason).toBe('ttl_out_of_range');
  });

  it('respeita as cotas de convites em aberto', () => {
    expect(
      evaluateInvite({ ...baseInvite, networkPendingCount: P.maxPendingInvitesPerNetwork }).reason,
    ).toBe('network_invite_quota');
    expect(evaluateInvite({ ...baseInvite, orgPendingCount: P.maxPendingInvitesPerOrg }).reason).toBe(
      'org_invite_quota',
    );
  });

  it('silencia reconvite dentro da carência e libera fora dela', () => {
    expect(
      evaluateInvite({ ...baseInvite, secondsSinceDecline: P.reinviteAfterDeclineSeconds - 1 })
        .reason,
    ).toBe('reinvite_cooldown');
    expect(
      evaluateInvite({ ...baseInvite, secondsSinceDecline: P.reinviteAfterDeclineSeconds }).allowed,
    ).toBe(true);
    expect(
      evaluateInvite({ ...baseInvite, secondsSinceRevoke: P.reinviteAfterRevokeSeconds - 1 }).reason,
    ).toBe('reinvite_cooldown');
  });
});

describe('governança — o relógio vence o registro', () => {
  const now = new Date('2026-07-26T12:00:00Z');

  it('trata convite pendente vencido como expirado antes do cron', () => {
    expect(effectiveInviteStatus('pending', new Date(now.getTime() - 1000), now)).toBe('expired');
    expect(effectiveInviteStatus('pending', new Date(now.getTime() + 1000), now)).toBe('pending');
  });

  it('não deixa relógio corrompido liberar um convite', () => {
    expect(effectiveInviteStatus('pending', 'data-invalida', now)).toBe('pending');
  });

  it.each(INVITE_STATUSES.filter((s) => s !== 'pending'))(
    'não reabre estado terminal (%s)',
    (status) => {
      expect(effectiveInviteStatus(status, new Date(0), now)).toBe(status);
      expect(isTerminalInviteStatus(status)).toBe(true);
      for (const target of INVITE_STATUSES) expect(canTransitionInvite(status, target)).toBe(false);
    },
  );

  it('recusa aceite de convite vencido e de convite alheio', () => {
    expect(
      evaluateRespond({
        isInvitedOrg: true,
        storedStatus: 'pending',
        expiresAt: new Date(now.getTime() - 1),
        now,
      }).reason,
    ).toBe('invite_expired');
    expect(
      evaluateRespond({
        isInvitedOrg: false,
        storedStatus: 'pending',
        expiresAt: new Date(now.getTime() + 10_000),
        now,
      }).reason,
    ).toBe('not_invited_org');
  });
});

describe('governança — participação', () => {
  it('só a dona da rede altera participações', () => {
    expect(
      evaluateMembershipChange({
        isNetworkOwner: false,
        current: 'active',
        target: 'suspended',
        isOwnerMembership: false,
      }).reason,
    ).toBe('not_network_owner');
  });

  it('protege a participação da própria dona', () => {
    expect(
      evaluateMembershipChange({
        isNetworkOwner: true,
        current: 'active',
        target: 'suspended',
        isOwnerMembership: true,
      }).reason,
    ).toBe('owner_membership_immutable');
  });

  it.each(MEMBERSHIPS)('nunca permite transição para o próprio estado (%s)', (status) => {
    if (status === null) return;
    expect(canTransitionMembership(status, status)).toBe(false);
  });

  it('não ressuscita participação para pendente', () => {
    expect(canTransitionMembership('active', 'pending')).toBe(false);
    expect(canTransitionMembership('suspended', 'pending')).toBe(false);
  });

  it('suspensão é reversível; remoção revoga o que foi compartilhado', () => {
    expect(canTransitionMembership('suspended', 'active')).toBe(true);
    const actions: GovernanceAction[] = [
      'invite_created',
      'invite_accepted',
      'membership_suspended',
      'membership_reinstated',
      'membership_removed',
    ];
    for (const action of actions) {
      expect(shouldRevokeEntriesOnChange(action)).toBe(action === 'membership_removed');
    }
  });

  it('somente participação ativa troca dados', () => {
    expect(membershipIsOperational('active')).toBe(true);
    for (const status of ['pending', 'suspended', null] as const) {
      expect(membershipIsOperational(status)).toBe(false);
    }
  });

  it('resiste a poluição de protótipo nas chaves de estado', () => {
    expect(canTransitionInvite('__proto__' as InviteStatus, 'accepted')).toBe(false);
    expect(canTransitionMembership('constructor' as MembershipStatus, 'active')).toBe(false);
  });
});
