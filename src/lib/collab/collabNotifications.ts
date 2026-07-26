/**
 * Onda 130 — Notificações da rede colaborativa.
 *
 * Fonte da verdade em TypeScript do MESMO roteamento aplicado no banco por
 * `public.collab_notification_policy()` e `public.collab_emit_notifications()`.
 * A paridade é verificada no CI por `scripts/check-collab-notifications.mjs`.
 *
 * ## Por que existe uma camada de roteamento
 *
 * Um evento de governança (Onda 128) não tem "um destinatário" — tem partes.
 * Quando a dona da rede revoga um convite, quem precisa saber é a organização
 * convidada; quando a convidada recusa, quem precisa saber é a dona. Emitir
 * para "todo mundo da rede" transformaria a caixa de entrada em ruído e, pior,
 * vazaria para terceiros que a organização X foi suspensa — um fato entre duas
 * partes. O roteamento aqui é **de mínimo privilégio**: cada evento vai para as
 * organizações que são parte dele, e para mais ninguém.
 *
 * ## Por que a deduplicação é uma chave, não uma checagem
 *
 * Gatilhos disparam de novo em reprocessamento, retentativa de RPC ou um
 * `UPDATE` idempotente que não muda nada. Deduplicar com `SELECT ... IF NOT
 * EXISTS` é uma corrida perdida sob concorrência. A chave determinística
 * (`buildDedupKey`) vira índice único: duas emissões do mesmo fato colidem no
 * banco e a segunda é descartada em silêncio. O evento é o que aconteceu, não
 * quantas vezes o gatilho rodou.
 */

import type { GovernanceAction } from './collabGovernance';

/** Política de notificação — espelho de `public.collab_notification_policy()`. */
export const COLLAB_NOTIFICATION_POLICY = {
  /** Notificação some da caixa de entrada depois disso (limpeza por cron). */
  retentionDays: 90,
  /** Teto de notificações não lidas exibidas com contagem exata. */
  unreadBadgeCap: 99,
  /** Tamanho máximo do resumo textual persistido. */
  maxSummaryChars: 280,
} as const;

/** Tipo de notificação entregue a uma organização. */
export type CollabNotificationKind =
  | 'invite_received'
  | 'invite_accepted'
  | 'invite_declined'
  | 'invite_revoked'
  | 'invite_expired'
  | 'membership_suspended'
  | 'membership_reinstated'
  | 'membership_removed';

/** Para quem o evento é endereçado. */
export type CollabAudience = 'owner_org' | 'counterpart_org';

/** Severidade da notificação — governa cor e ordenação na caixa de entrada. */
export type CollabNotificationSeverity = 'info' | 'attention' | 'critical';

interface KindSpec {
  readonly kind: CollabNotificationKind;
  readonly audiences: readonly CollabAudience[];
  readonly severity: CollabNotificationSeverity;
  /** Exige decisão humana (aceitar/recusar) — nunca some sozinha da lista. */
  readonly actionable: boolean;
}

/**
 * Mapa ação de governança → notificação. A ordem de `audiences` é estável
 * porque o banco emite uma linha por audiência e o gate compara a lista literal.
 */
const KIND_BY_ACTION: Readonly<Record<GovernanceAction, KindSpec>> = Object.freeze({
  // Convite criado: só a convidada precisa agir. A dona acabou de emitir — não
  // se notifica alguém do que ela mesma fez um milissegundo atrás.
  invite_created: Object.freeze({
    kind: 'invite_received',
    audiences: Object.freeze(['counterpart_org'] as const),
    severity: 'attention',
    actionable: true,
  }),
  invite_accepted: Object.freeze({
    kind: 'invite_accepted',
    audiences: Object.freeze(['owner_org'] as const),
    severity: 'info',
    actionable: false,
  }),
  invite_declined: Object.freeze({
    kind: 'invite_declined',
    audiences: Object.freeze(['owner_org'] as const),
    severity: 'info',
    actionable: false,
  }),
  invite_revoked: Object.freeze({
    kind: 'invite_revoked',
    audiences: Object.freeze(['counterpart_org'] as const),
    severity: 'info',
    actionable: false,
  }),
  // Vencimento não tem autor: ninguém decidiu, o relógio decidiu. As duas
  // partes ficam sabendo, porque as duas estavam esperando uma resposta.
  invite_expired: Object.freeze({
    kind: 'invite_expired',
    audiences: Object.freeze(['owner_org', 'counterpart_org'] as const),
    severity: 'info',
    actionable: false,
  }),
  membership_suspended: Object.freeze({
    kind: 'membership_suspended',
    audiences: Object.freeze(['counterpart_org'] as const),
    severity: 'attention',
    actionable: false,
  }),
  membership_reinstated: Object.freeze({
    kind: 'membership_reinstated',
    audiences: Object.freeze(['counterpart_org'] as const),
    severity: 'info',
    actionable: false,
  }),
  // Remoção revoga entradas compartilhadas: é perda de dado, não aviso.
  membership_removed: Object.freeze({
    kind: 'membership_removed',
    audiences: Object.freeze(['counterpart_org'] as const),
    severity: 'critical',
    actionable: false,
  }),
});

/** Espelho de `public.collab_notification_kind(action)`. */
export const notificationKindForAction = (action: GovernanceAction): CollabNotificationKind =>
  KIND_BY_ACTION[action].kind;

/** Audiências de uma ação, na ordem estável usada pelo banco. */
export const audiencesForAction = (action: GovernanceAction): readonly CollabAudience[] =>
  KIND_BY_ACTION[action].audiences;

/** Severidade de um tipo de notificação. */
export function severityForKind(kind: CollabNotificationKind): CollabNotificationSeverity {
  for (const spec of Object.values(KIND_BY_ACTION)) {
    if (spec.kind === kind) return spec.severity;
  }
  /* c8 ignore next */
  throw new Error(`collab_notifications: tipo desconhecido "${kind}"`);
}

/** Notificação que pede decisão humana (aceitar/recusar um convite). */
export function isActionableKind(kind: CollabNotificationKind): boolean {
  for (const spec of Object.values(KIND_BY_ACTION)) {
    if (spec.kind === kind) return spec.actionable;
  }
  /* c8 ignore next */
  return false;
}

export interface GovernanceEvent {
  readonly action: GovernanceAction;
  /** Organização dona da rede. */
  readonly ownerOrgId: string;
  /** A outra parte: convidada ou participante afetada. */
  readonly counterpartOrgId: string;
  readonly networkId: string;
  /** Convite envolvido, quando houver. */
  readonly invitationId?: string | null;
}

export interface EmittedNotification {
  readonly networkId: string;
  /** Organização que recebe a notificação na caixa de entrada. */
  readonly organizationId: string;
  /** Organização que provocou o evento (ou a contraparte, no vencimento). */
  readonly actorOrgId: string;
  readonly kind: CollabNotificationKind;
  readonly severity: CollabNotificationSeverity;
  readonly invitationId: string | null;
  readonly dedupKey: string;
}

/**
 * Chave determinística de deduplicação — espelho de
 * `public.collab_notification_dedup_key()`.
 *
 * Inclui a organização destinatária porque o mesmo fato (um vencimento) gera
 * duas linhas legítimas, uma por parte; sem a organização na chave, a segunda
 * seria descartada como duplicata e uma das partes ficaria sem aviso.
 *
 * NÃO inclui o relógio: um evento reprocessado dois segundos depois é o mesmo
 * evento. Carimbar tempo na chave anularia a deduplicação exatamente no caso
 * em que ela existe para servir.
 */
export function buildDedupKey(input: {
  kind: CollabNotificationKind;
  organizationId: string;
  networkId: string;
  invitationId?: string | null;
  counterpartOrgId: string;
}): string {
  // Convites são a âncora quando existem: um reconvite gera um id novo e,
  // portanto, uma notificação nova — que é o comportamento desejado. Sem
  // convite (suspensão, remoção), a âncora é o par rede+contraparte, e a
  // transição de estado é o que distingue os tipos.
  const anchor = input.invitationId ?? `${input.networkId}:${input.counterpartOrgId}`;
  return `${input.kind}:${anchor}:${input.organizationId}`;
}

/**
 * Traduz um evento de governança nas notificações que devem existir.
 *
 * Auto-endereçamento é impossível por construção: se a dona da rede e a
 * contraparte forem a mesma organização (dado inconsistente, mas possível sob
 * corrida), nada é emitido em vez de notificar alguém sobre a própria ação.
 */
export function routeGovernanceEvent(event: GovernanceEvent): EmittedNotification[] {
  const spec = KIND_BY_ACTION[event.action];
  /* c8 ignore next */
  if (!spec) return [];
  if (event.ownerOrgId === event.counterpartOrgId) return [];

  const out: EmittedNotification[] = [];
  for (const audience of spec.audiences) {
    const organizationId = audience === 'owner_org' ? event.ownerOrgId : event.counterpartOrgId;
    const actorOrgId = audience === 'owner_org' ? event.counterpartOrgId : event.ownerOrgId;
    out.push({
      networkId: event.networkId,
      organizationId,
      actorOrgId,
      kind: spec.kind,
      severity: spec.severity,
      invitationId: event.invitationId ?? null,
      dedupKey: buildDedupKey({
        kind: spec.kind,
        organizationId,
        networkId: event.networkId,
        invitationId: event.invitationId,
        counterpartOrgId: event.counterpartOrgId,
      }),
    });
  }
  return out;
}

/** Rótulo do contador de não lidas, com teto — espelho da UI e do gate. */
export function formatUnreadBadge(count: number): string {
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (safe === 0) return '';
  const cap = COLLAB_NOTIFICATION_POLICY.unreadBadgeCap;
  return safe > cap ? `${cap}+` : String(safe);
}

/**
 * Uma notificação está fora da janela de retenção (candidata à limpeza).
 * O relógio é injetável — testar retenção não pode depender da hora do sistema.
 */
export function isExpiredNotification(createdAt: Date, now: Date): boolean {
  const ms = COLLAB_NOTIFICATION_POLICY.retentionDays * 86_400_000;
  return now.getTime() - createdAt.getTime() >= ms;
}
