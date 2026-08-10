/**
 * Onda 128 — Convites e governança da rede colaborativa.
 *
 * Fonte da verdade em TypeScript das MESMAS regras aplicadas no banco por
 * `public.collab_governance_policy()`, `public.collab_invite_org()`,
 * `public.collab_respond_invite()`, `public.collab_revoke_invite()`,
 * `public.collab_set_membership_status()` e `public.collab_expire_invitations()`.
 * A paridade literal é verificada no CI por `scripts/check-collab-governance.mjs`.
 *
 * Por que duplicar: a UI precisa desabilitar "Aceitar" num convite vencido e
 * explicar "essa organização recusou há 2 dias, aguarde" sem ida ao servidor.
 * Duplicar sem gate é divergência garantida; com gate, é cache.
 *
 * Princípio de projeto: **o estado gravado nunca decide sozinho**. Um convite
 * com `status='pending'` e `expires_at` no passado está vencido, mesmo que o
 * cron de expiração ainda não tenha rodado. Confiar na coluna `status` seria
 * abrir uma janela em que um convite morto ainda admite alguém na rede.
 */

/** Política de governança — espelho de `public.collab_governance_policy()`. */
export const COLLAB_GOVERNANCE_POLICY = {
  /** Validade padrão de um convite quando o autor não define. */
  defaultInviteTtlDays: 14,
  /** Teto duro de validade de um convite. */
  maxInviteTtlDays: 60,
  /** Convites em aberto simultâneos que uma rede pode manter. */
  maxPendingInvitesPerNetwork: 200,
  /** Convites em aberto que uma organização pode receber ao mesmo tempo. */
  maxPendingInvitesPerOrg: 20,
  /** Silêncio antes de reconvidar quem recusou (anti-assédio). */
  reinviteAfterDeclineSeconds: 86_400,
  /** Silêncio antes de reconvidar após o convite anterior ter sido revogado. */
  reinviteAfterRevokeSeconds: 3_600,
  /** Suspensão automática é sempre reversível; remoção não. */
  suspensionIsReversible: true,
} as const;

/** Estado de um convite. `pending` é o único não terminal. */
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

/** Estado de participação — espelho de `collab_memberships.status`. */
export type MembershipStatus = 'pending' | 'active' | 'suspended';

/** Ação de governança registrada na trilha imutável. */
export type GovernanceAction =
  | 'invite_created'
  | 'invite_accepted'
  | 'invite_declined'
  | 'invite_revoked'
  | 'invite_expired'
  | 'membership_suspended'
  | 'membership_reinstated'
  | 'membership_removed';

export type InviteRejection =
  | 'not_network_owner'
  | 'target_is_owner'
  | 'already_member'
  | 'invite_already_pending'
  | 'ttl_out_of_range'
  | 'network_invite_quota'
  | 'org_invite_quota'
  | 'reinvite_cooldown';

export type RespondRejection = 'not_invited_org' | 'invite_not_pending' | 'invite_expired';

export type MembershipRejection =
  | 'not_network_owner'
  | 'membership_not_found'
  | 'owner_membership_immutable'
  | 'illegal_transition';

/** Transições legais do convite. Estados terminais não têm saída. */
const INVITE_TRANSITIONS: Readonly<Record<InviteStatus, readonly InviteStatus[]>> = Object.freeze({
  pending: Object.freeze(['accepted', 'declined', 'revoked', 'expired'] as const),
  accepted: Object.freeze([] as const),
  declined: Object.freeze([] as const),
  revoked: Object.freeze([] as const),
  expired: Object.freeze([] as const),
});

/** Transições legais da participação. */
const MEMBERSHIP_TRANSITIONS: Readonly<Record<MembershipStatus, readonly MembershipStatus[]>> =
  Object.freeze({
    pending: Object.freeze(['active', 'suspended'] as const),
    active: Object.freeze(['suspended'] as const),
    suspended: Object.freeze(['active'] as const),
  });

export const isTerminalInviteStatus = (status: InviteStatus): boolean =>
  INVITE_TRANSITIONS[status]?.length === 0;

export const canTransitionInvite = (from: InviteStatus, to: InviteStatus): boolean =>
  Object.prototype.hasOwnProperty.call(INVITE_TRANSITIONS, from) &&
  INVITE_TRANSITIONS[from].includes(to);

export const canTransitionMembership = (from: MembershipStatus, to: MembershipStatus): boolean =>
  Object.prototype.hasOwnProperty.call(MEMBERSHIP_TRANSITIONS, from) &&
  MEMBERSHIP_TRANSITIONS[from].includes(to);

/**
 * Estado EFETIVO do convite: o relógio vence o registro.
 *
 * Um convite `pending` cujo `expires_at` já passou está expirado agora, não
 * quando o cron passar. Sem isso existe uma janela (até 1 hora, no nosso cron)
 * em que um convite morto ainda admitiria uma organização na rede.
 */
export function effectiveInviteStatus(
  stored: InviteStatus,
  expiresAt: Date | string,
  now: Date | string = new Date()
): InviteStatus {
  if (stored !== 'pending') return stored;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const clock = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(expiry.getTime()) || !Number.isFinite(clock.getTime())) return 'pending';
  return clock.getTime() >= expiry.getTime() ? 'expired' : 'pending';
}

export interface InviteContext {
  /** A organização que convida é dona da rede? */
  readonly isNetworkOwner: boolean;
  /** A organização convidada é a própria dona da rede? */
  readonly targetIsOwner: boolean;
  /** Já existe participação (qualquer estado) da organização alvo? */
  readonly existingMembership: MembershipStatus | null;
  /** Já existe convite pendente e ainda válido para a organização alvo? */
  readonly hasPendingInvite: boolean;
  /** Convites pendentes válidos na rede. */
  readonly networkPendingCount: number;
  /** Convites pendentes válidos recebidos pela organização alvo. */
  readonly orgPendingCount: number;
  /** Segundos desde a última recusa desta organização nesta rede (null = nunca). */
  readonly secondsSinceDecline: number | null;
  /** Segundos desde a última revogação de convite para esta organização. */
  readonly secondsSinceRevoke: number | null;
  /** Validade pedida, em dias (null = usar o padrão). */
  readonly ttlDays: number | null;
}

export interface Decision<R extends string> {
  readonly allowed: boolean;
  readonly reason: R | null;
}

const deny = <R extends string>(reason: R): Decision<R> => ({ allowed: false, reason });
const allow = <R extends string>(): Decision<R> => ({ allowed: true, reason: null });

/**
 * Decide se um convite pode ser emitido. A ordem das guardas é deliberada:
 * autoridade → coerência do alvo → duplicidade → limites → anti-assédio.
 * Invertida, um dono legítimo receberia "cota excedida" por um alvo que sequer
 * poderia ser convidado, e o operador perseguiria o erro errado.
 */
export function evaluateInvite(ctx: InviteContext): Decision<InviteRejection> {
  const p = COLLAB_GOVERNANCE_POLICY;
  if (!ctx.isNetworkOwner) return deny('not_network_owner');
  if (ctx.targetIsOwner) return deny('target_is_owner');
  if (ctx.existingMembership === 'active' || ctx.existingMembership === 'suspended') {
    return deny('already_member');
  }
  if (ctx.hasPendingInvite) return deny('invite_already_pending');

  const ttl = ctx.ttlDays ?? p.defaultInviteTtlDays;
  if (!Number.isFinite(ttl) || !Number.isInteger(ttl) || ttl < 1 || ttl > p.maxInviteTtlDays) {
    return deny('ttl_out_of_range');
  }

  if (ctx.networkPendingCount >= p.maxPendingInvitesPerNetwork) return deny('network_invite_quota');
  if (ctx.orgPendingCount >= p.maxPendingInvitesPerOrg) return deny('org_invite_quota');

  const decline = ctx.secondsSinceDecline;
  if (decline !== null && Number.isFinite(decline) && decline < p.reinviteAfterDeclineSeconds) {
    return deny('reinvite_cooldown');
  }
  const revoke = ctx.secondsSinceRevoke;
  if (revoke !== null && Number.isFinite(revoke) && revoke < p.reinviteAfterRevokeSeconds) {
    return deny('reinvite_cooldown');
  }
  return allow();
}

export interface RespondContext {
  readonly isInvitedOrg: boolean;
  readonly storedStatus: InviteStatus;
  readonly expiresAt: Date | string;
  readonly now?: Date | string;
}

/** Decide se a organização convidada pode aceitar ou recusar o convite. */
export function evaluateRespond(ctx: RespondContext): Decision<RespondRejection> {
  if (!ctx.isInvitedOrg) return deny('not_invited_org');
  const effective = effectiveInviteStatus(ctx.storedStatus, ctx.expiresAt, ctx.now ?? new Date());
  if (effective === 'expired' && ctx.storedStatus === 'pending') return deny('invite_expired');
  if (effective !== 'pending') return deny('invite_not_pending');
  return allow();
}

export interface MembershipChangeContext {
  readonly isNetworkOwner: boolean;
  readonly current: MembershipStatus | null;
  readonly target: MembershipStatus;
  /** A participação é a da própria organização dona da rede? */
  readonly isOwnerMembership: boolean;
}

/**
 * Decide uma mudança de participação (suspender / reintegrar).
 *
 * A participação da dona da rede é imutável: suspendê-la deixaria a rede sem
 * ninguém capaz de administrá-la, e o dono não teria como se reintegrar.
 */
export function evaluateMembershipChange(
  ctx: MembershipChangeContext
): Decision<MembershipRejection> {
  if (!ctx.isNetworkOwner) return deny('not_network_owner');
  if (ctx.current === null) return deny('membership_not_found');
  if (ctx.isOwnerMembership) return deny('owner_membership_immutable');
  if (!canTransitionMembership(ctx.current, ctx.target)) return deny('illegal_transition');
  return allow();
}

/**
 * Uma participação suspensa deixa de casar placas, mas as entradas que a
 * organização compartilhou continuam existindo — suspensão é reversível.
 * Remoção é definitiva e, aí sim, revoga as entradas: uma organização que saiu
 * não pode continuar disparando alertas na rede que abandonou.
 */
export const shouldRevokeEntriesOnChange = (action: GovernanceAction): boolean =>
  action === 'membership_removed';

/** Participação que efetivamente troca dados na rede. */
export const membershipIsOperational = (status: MembershipStatus | null): boolean =>
  status === 'active';
