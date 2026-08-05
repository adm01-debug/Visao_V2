/**
 * Onda 151 — REGRA ÚNICA DE ADMISSÃO DE CONCESSÃO (console de permissões).
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 150 entregou a *resolução* (papel + concessões ⇒ conjunto efetivo),
 * mas não entregou a *admissão*: quem pode criar uma concessão, sobre quem,
 * com qual prazo e com qual justificativa. Sem essa camada, a tabela
 * `user_capability_grants` é apenas uma tabela — e uma tabela com RLS de
 * admin aceita, sem reclamar:
 *
 *  - concessão **eterna** ("temporária" que ninguém revoga);
 *  - **auto-concessão** (o próprio admin ampliando o próprio poder sem
 *    rastro de um segundo responsável);
 *  - **escalada além do próprio conjunto** (conceder o que você mesmo não
 *    tem — o clássico caminho de subida de privilégio);
 *  - concessão **inócua** (conceder o que o piso do papel já dá), que polui
 *    a auditoria e cria falsa sensação de controle;
 *  - `deny` **impossível** (negar `users.grant_capability` de um admin, que
 *    a regra de resolução ignora por anti-lockout).
 *
 * Este módulo é puro, sem relógio próprio (o instante é injetado) e sem
 * rede, para que o CI varra centenas de cenários e o banco espelhe a mesma
 * decisão em `public.grant_capability()` / `public.revoke_capability()`.
 *
 * ## Decisões e o porquê
 *
 *  - **Prazo é obrigatório e limitado (≤ 90 dias).** Permissão excepcional
 *    sem data de morte vira permissão permanente. O teto força a renovação
 *    consciente — que é registrada — em vez do esquecimento silencioso.
 *  - **Ninguém concede a si mesmo.** Nem admin. A trilha precisa mostrar
 *    dois nomes: quem pediu e quem autorizou.
 *  - **Não se concede o que não se tem.** O concedente só distribui
 *    capacidades do seu próprio conjunto efetivo. `deny`, ao contrário, não
 *    exige posse: tirar acesso nunca é escalada.
 *  - **Redundante é recusado, não aceito em silêncio.** Se o piso do papel
 *    já concede, a linha não muda nada; aceitá-la enganaria a auditoria.
 *  - **`deny` inócuo é recusado.** Negar algo que o alvo não tem, ou negar
 *    `users.grant_capability` de um admin (anti-lockout da Onda 150), seria
 *    uma linha que promete um bloqueio que não existe.
 *  - **Revogação é idempotente e irreversível.** Revogar duas vezes não é
 *    erro; "desrevogar" não existe — cria-se uma nova concessão, com nova
 *    justificativa e novo prazo.
 *  - **Justificativa obrigatória (≥ 8 caracteres úteis).** A pergunta que a
 *    auditoria faz seis meses depois é "por quê", não "quando".
 *
 * Invariantes varridas pela simulação e pelo gate:
 *   G1 toda admissão aprovada tem prazo no futuro e ≤ 90 dias
 *   G2 nenhuma admissão aprovada tem ator == alvo
 *   G3 `grant` aprovado ⇒ o ator possuía a capacidade
 *   G4 admissão aprovada sempre altera o conjunto efetivo do alvo
 *   G5 sem `users.grant_capability` nada é aprovado
 *   G6 o veredito independe da ordem de avaliação das regras (motivo único)
 *   G7 revogação é idempotente: aplicar duas vezes tem o mesmo efeito
 */

import {
  ADMIN_LOCKOUT_GUARD,
  isKnownCapability,
  resolveCapabilities,
  type AppRole,
  type Capability,
  type CapabilityGrant,
  type CapabilityGrantEffect,
} from './capabilities';

/** Teto de prazo. Além disso, é cargo — e cargo se resolve mudando o papel. */
export const MAX_GRANT_DAYS = 90;
export const MAX_GRANT_MS = MAX_GRANT_DAYS * 24 * 60 * 60 * 1000;
/** Tamanho mínimo da justificativa, já descontados espaços nas bordas. */
export const MIN_REASON_LENGTH = 8;

export type GrantRejection =
  | 'actor_missing_capability' // ator não pode conceder permissões
  | 'self_grant' // ator == alvo
  | 'unknown_capability' // fora do catálogo fechado
  | 'reason_required' // justificativa ausente/curta
  | 'expiry_required' // prazo ausente
  | 'expiry_in_past' // prazo já vencido no instante da criação
  | 'expiry_too_far' // prazo além do teto
  | 'escalation' // conceder o que o ator não possui
  | 'redundant_grant' // alvo já possui pelo piso/concessão ativa
  | 'ineffective_deny'; // alvo não possui, ou anti-lockout de admin

export interface GrantRequest {
  actorId: string;
  actorRole: AppRole;
  /** Concessões ativas do próprio ator (para calcular o que ele possui). */
  actorGrants: readonly CapabilityGrant[];
  targetId: string;
  targetRole: AppRole;
  targetGrants: readonly CapabilityGrant[];
  capability: string;
  effect: CapabilityGrantEffect;
  reason: string;
  /** Epoch ms. `null` é recusado de propósito: prazo é obrigatório. */
  expiresAtMs: number | null;
}

export interface GrantDecision {
  allowed: boolean;
  /** Motivo único da recusa. `null` quando aprovado. */
  rejection: GrantRejection | null;
  /** Mensagem PT-BR pronta para a interface. */
  message: string;
}

const REJECTION_MESSAGES: Record<GrantRejection, string> = {
  actor_missing_capability: 'Você não tem permissão para conceder capacidades.',
  self_grant: 'Não é possível conceder ou negar capacidades para si mesmo.',
  unknown_capability: 'Capacidade desconhecida.',
  reason_required: `Informe uma justificativa com pelo menos ${MIN_REASON_LENGTH} caracteres.`,
  expiry_required: 'Toda concessão precisa de prazo de validade.',
  expiry_in_past: 'O prazo informado já está vencido.',
  expiry_too_far: `O prazo máximo é de ${MAX_GRANT_DAYS} dias.`,
  escalation: 'Você não pode conceder uma capacidade que não possui.',
  redundant_grant: 'O usuário já possui essa capacidade — a concessão não teria efeito.',
  ineffective_deny: 'A negação não teria efeito sobre este usuário.',
};

const approved: GrantDecision = { allowed: true, rejection: null, message: 'Concessão válida.' };

const reject = (rejection: GrantRejection): GrantDecision => ({
  allowed: false,
  rejection,
  message: REJECTION_MESSAGES[rejection],
});

/**
 * Decide se uma concessão pode ser criada. Ordem das checagens é do mais
 * geral (autorização do ator) para o mais específico (efeito real), para que
 * a mensagem devolvida seja a causa raiz — e não um detalhe de formulário
 * escondendo uma falta de permissão.
 */
export function evaluateGrantRequest(request: GrantRequest, nowMs: number): GrantDecision {
  const actor = resolveCapabilities(request.actorRole, request.actorGrants, nowMs);
  if (!actor.granted.has('users.grant_capability')) return reject('actor_missing_capability');
  if (request.actorId === request.targetId) return reject('self_grant');
  if (!isKnownCapability(request.capability)) return reject('unknown_capability');

  const capability = request.capability as Capability;

  if (request.reason.trim().length < MIN_REASON_LENGTH) return reject('reason_required');
  if (request.expiresAtMs == null) return reject('expiry_required');
  if (request.expiresAtMs <= nowMs) return reject('expiry_in_past');
  if (request.expiresAtMs - nowMs > MAX_GRANT_MS) return reject('expiry_too_far');

  const target = resolveCapabilities(request.targetRole, request.targetGrants, nowMs);
  const targetHas = target.granted.has(capability);

  if (request.effect === 'grant') {
    if (!actor.granted.has(capability)) return reject('escalation');
    if (targetHas) return reject('redundant_grant');
    return approved;
  }

  // effect === 'deny'
  if (request.targetRole === 'admin' && ADMIN_LOCKOUT_GUARD.includes(capability)) {
    return reject('ineffective_deny');
  }
  if (!targetHas) return reject('ineffective_deny');
  return approved;
}

/**
 * Projeta o efeito de uma concessão aprovada sobre o conjunto do alvo.
 * Usado pela interface para mostrar, antes de confirmar, exatamente o que
 * muda — e pela simulação para provar a invariante G4.
 */
export function projectGrantEffect(
  request: GrantRequest,
  nowMs: number
): { before: readonly Capability[]; after: readonly Capability[]; changed: boolean } {
  const before = resolveCapabilities(request.targetRole, request.targetGrants, nowMs);
  const next: CapabilityGrant[] = [
    ...request.targetGrants,
    {
      capability: request.capability,
      effect: request.effect,
      expiresAtMs: request.expiresAtMs,
      revokedAtMs: null,
    },
  ];
  const after = resolveCapabilities(request.targetRole, next, nowMs);
  const beforeList = [...before.granted].sort();
  const afterList = [...after.granted].sort();
  return {
    before: beforeList,
    after: afterList,
    changed: beforeList.join('|') !== afterList.join('|'),
  };
}

export type RevokeRejection = 'actor_missing_capability' | 'not_found' | 'self_revoke';

export interface RevokeRequest {
  actorId: string;
  actorRole: AppRole;
  actorGrants: readonly CapabilityGrant[];
  /** Dono da linha alvo. */
  targetId: string;
  /** `null` quando a linha não existe. */
  grantExists: boolean;
  /** Já revogada? Revogar de novo é aceito (idempotência). */
  alreadyRevoked: boolean;
}

export interface RevokeDecision {
  allowed: boolean;
  rejection: RevokeRejection | null;
  /** `true` quando a linha já estava revogada: aceito, mas sem escrita. */
  noop: boolean;
  message: string;
}

/**
 * Revogação. Diferente da concessão, **é permitida sobre si mesmo**: reduzir
 * o próprio poder nunca é escalada, e travar isso deixaria uma negação
 * indevida sem saída rápida.
 */
export function evaluateRevokeRequest(request: RevokeRequest, nowMs: number): RevokeDecision {
  const actor = resolveCapabilities(request.actorRole, request.actorGrants, nowMs);
  if (!actor.granted.has('users.grant_capability')) {
    return {
      allowed: false,
      rejection: 'actor_missing_capability',
      noop: false,
      message: REJECTION_MESSAGES.actor_missing_capability,
    };
  }
  if (!request.grantExists) {
    return {
      allowed: false,
      rejection: 'not_found',
      noop: false,
      message: 'Concessão não encontrada.',
    };
  }
  if (request.alreadyRevoked) {
    return { allowed: true, rejection: null, noop: true, message: 'Concessão já estava revogada.' };
  }
  return { allowed: true, rejection: null, noop: false, message: 'Concessão revogada.' };
}

/** Estado de uma linha para exibição no console. */
export type GrantRowState = 'active' | 'expired' | 'revoked';

export function grantRowState(
  grant: { expiresAtMs: number | null; revokedAtMs?: number | null },
  nowMs: number
): GrantRowState {
  if (grant.revokedAtMs != null && grant.revokedAtMs <= nowMs) return 'revoked';
  if (grant.expiresAtMs != null && grant.expiresAtMs <= nowMs) return 'expired';
  return 'active';
}

export const GRANT_ROW_STATE_LABELS: Record<GrantRowState, string> = {
  active: 'Ativa',
  expired: 'Vencida',
  revoked: 'Revogada',
};

/** Prazo restante em horas inteiras (piso). Negativo vira 0. */
export function remainingHours(expiresAtMs: number | null, nowMs: number): number | null {
  if (expiresAtMs == null) return null;
  return Math.max(0, Math.floor((expiresAtMs - nowMs) / 3_600_000));
}
