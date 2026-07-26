/**
 * Onda 129 — Modelo de visão da governança colaborativa.
 *
 * Esta camada NÃO decide nada sobre segurança: quem decide é o banco, nas
 * rotinas `SECURITY DEFINER` da Onda 128. O papel daqui é **não oferecer** um
 * botão que o banco vai recusar — um botão que erra é pior do que um botão
 * ausente, porque ensina o operador a desconfiar da tela.
 *
 * Regra herdada da Onda 128 e reafirmada aqui: **o relógio vence o registro**.
 * Um convite com `status = 'pending'` e validade no passado já está morto; a
 * tela precisa mostrá-lo como vencido mesmo antes do cron horário materializar
 * a coluna, senão o operador vê "aguardando resposta" para algo que ninguém
 * mais consegue aceitar.
 */

import {
  effectiveInviteStatus,
  type InviteStatus,
  type MembershipStatus,
} from './collabGovernance';

export type InviteTone = 'pending' | 'positive' | 'neutral' | 'negative';

export interface InviteViewInput {
  /** A organização do operador é dona da rede? */
  viewerIsNetworkOwner: boolean;
  /** Organização ativa do operador (null quando ele ainda não escolheu uma). */
  viewerOrgId: string | null;
  /** Organização destinatária do convite. */
  invitedOrgId: string;
  /** Status persistido na coluna — pode estar defasado em relação ao relógio. */
  storedStatus: InviteStatus;
  expiresAt: Date | string | null;
  now: Date;
}

export interface InviteView {
  /** Status que o operador deve ver, já corrigido pelo relógio. */
  effectiveStatus: InviteStatus;
  label: string;
  tone: InviteTone;
  /** Só a dona da rede revoga, e só o que ainda está de pé. */
  canRevoke: boolean;
  /** Só a organização convidada responde, e só enquanto o convite vive. */
  canAccept: boolean;
  canDecline: boolean;
  /** Segundos restantes; null quando não há prazo ou o convite já é terminal. */
  secondsRemaining: number | null;
}

const INVITE_LABEL: Record<InviteStatus, { label: string; tone: InviteTone }> = {
  pending: { label: 'Aguardando resposta', tone: 'pending' },
  accepted: { label: 'Aceito', tone: 'positive' },
  declined: { label: 'Recusado', tone: 'neutral' },
  revoked: { label: 'Revogado', tone: 'neutral' },
  expired: { label: 'Vencido', tone: 'negative' },
};

function toTime(value: Date | string | null): number | null {
  if (value === null) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function deriveInviteView(input: InviteViewInput): InviteView {
  const { viewerIsNetworkOwner, viewerOrgId, invitedOrgId, storedStatus, expiresAt, now } = input;

  /*
   * Sem prazo não há como vencer: um convite sem `expires_at` (registro legado
   * ou defeituoso) permanece com o status gravado em vez de virar "vencido" por
   * omissão — inventar um vencimento aqui negaria uma resposta legítima.
   */
  const effectiveStatus =
    expiresAt === null ? storedStatus : effectiveInviteStatus(storedStatus, expiresAt, now);
  const presentation = INVITE_LABEL[effectiveStatus] ?? INVITE_LABEL.pending;
  const isLive = effectiveStatus === 'pending';

  /*
   * A dona da rede nunca é convidada (o banco recusa `target_is_owner`), mas a
   * tela não confia nisso: se um registro inconsistente chegar aqui, tratamos a
   * dona como dona — ela revoga, jamais responde a si mesma.
   */
  const viewerIsInvitedOrg =
    viewerOrgId !== null && viewerOrgId === invitedOrgId && !viewerIsNetworkOwner;

  const expiresAtTime = toTime(expiresAt);
  const secondsRemaining =
    isLive && expiresAtTime !== null
      ? Math.max(0, Math.ceil((expiresAtTime - now.getTime()) / 1000))
      : null;

  return {
    effectiveStatus,
    label: presentation.label,
    tone: presentation.tone,
    canRevoke: isLive && viewerIsNetworkOwner,
    canAccept: isLive && viewerIsInvitedOrg,
    canDecline: isLive && viewerIsInvitedOrg,
    secondsRemaining,
  };
}

export interface MembershipViewInput {
  viewerIsNetworkOwner: boolean;
  /** A participação em questão é a da própria dona da rede? */
  isOwnerMembership: boolean;
  status: MembershipStatus;
}

export interface MembershipView {
  label: string;
  tone: InviteTone;
  canSuspend: boolean;
  canReinstate: boolean;
  canRemove: boolean;
  /** Aviso exibido antes da remoção — ela revoga o que a organização compartilhou. */
  removeWarning: string;
}

const MEMBERSHIP_LABEL: Record<MembershipStatus, { label: string; tone: InviteTone }> = {
  pending: { label: 'Entrada pendente', tone: 'pending' },
  active: { label: 'Ativa', tone: 'positive' },
  suspended: { label: 'Suspensa', tone: 'negative' },
};

export function deriveMembershipView(input: MembershipViewInput): MembershipView {
  const { viewerIsNetworkOwner, isOwnerMembership, status } = input;
  const presentation = MEMBERSHIP_LABEL[status] ?? MEMBERSHIP_LABEL.pending;

  /*
   * A participação da dona é imutável: suspendê-la deixaria a rede sem quem a
   * administre, e removê-la destruiria a própria rede por uma via lateral.
   */
  const mutable = viewerIsNetworkOwner && !isOwnerMembership;

  return {
    label: presentation.label,
    tone: presentation.tone,
    canSuspend: mutable && status === 'active',
    canReinstate: mutable && status === 'suspended',
    canRemove: mutable,
    removeWarning:
      'Remover é definitivo: as placas compartilhadas por esta organização são revogadas e param de gerar alertas na rede. Para pausar sem perder o acervo, use Suspender.',
  };
}

/** Formata o prazo restante para leitura humana, sem prometer precisão que não temos. */
export function formatRemaining(secondsRemaining: number | null): string | null {
  if (secondsRemaining === null) return null;
  if (secondsRemaining <= 0) return 'vence agora';
  const days = Math.floor(secondsRemaining / 86_400);
  if (days >= 1) return `vence em ${days} ${days === 1 ? 'dia' : 'dias'}`;
  const hours = Math.floor(secondsRemaining / 3_600);
  if (hours >= 1) return `vence em ${hours}h`;
  const minutes = Math.max(1, Math.floor(secondsRemaining / 60));
  return `vence em ${minutes} min`;
}
