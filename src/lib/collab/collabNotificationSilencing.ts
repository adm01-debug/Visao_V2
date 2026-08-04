/**
 * Onda 131 — Silenciamento de avisos da rede colaborativa.
 *
 * Fonte da verdade em TypeScript do MESMO comportamento aplicado no banco por
 * `public.collab_notification_silenceable()`, `public.collab_silence_policy()`,
 * `public.collab_set_notification_silence()` e pelo recorte de
 * `public.collab_unread_counts()`. A paridade é verificada no CI por
 * `scripts/check-collab-notification-silence.mjs`.
 *
 * ## Por que silenciar não é apagar
 *
 * A caixa de entrada da Onda 130 é derivada de uma trilha imutável de
 * governança: cada aviso é a projeção de um fato que aconteceu entre duas
 * organizações. Deixar o usuário apagar um aviso seria deixá-lo apagar a
 * projeção de um fato — e, na prática, criar um sistema onde "não fui avisado"
 * é indistinguível de "escondi o aviso". Silenciar age só sobre o *realce*: o
 * aviso continua listado e auditável, apenas para de contar no contador de não
 * lidos e de disputar atenção.
 *
 * ## Por que nem todo tipo é silenciável
 *
 * Dois tipos de aviso não podem ser silenciados, e a regra é do banco, não da
 * tela:
 *
 * - **Acionáveis** (`invite_received`): pedem uma decisão humana com prazo. Um
 *   convite silenciado vence sozinho, e o usuário descobre pelo resultado — o
 *   pior momento possível.
 * - **Críticos** (`membership_removed`): representam perda de acesso a dados
 *   compartilhados. Silenciar perda de dado é transformar operação em
 *   surpresa.
 *
 * O restante é ruído legítimo de rede grande (aceites, recusas, vencimentos,
 * suspensões e reativações) e pode ser silenciado por organização.
 *
 * ## Por que o silêncio tem relógio, e o relógio é injetável
 *
 * Silêncio permanente vira cegueira permanente: seis meses depois ninguém
 * lembra que ligou aquilo. Por isso o silêncio tem `mutedUntil` opcional e
 * limitado, e o estado efetivo é **calculado pelo relógio**, nunca lido de uma
 * coluna booleana que alguém precisaria lembrar de atualizar. O `now` é
 * parâmetro em toda função (e `p_now` em toda rotina SQL) para que o teste
 * possa provar a virada do prazo sem esperar por ela.
 */

import {
  isActionableKind,
  severityForKind,
  type CollabNotificationKind,
} from './collabNotifications';

/** Política de silenciamento — espelho de `public.collab_silence_policy()`. */
export const COLLAB_SILENCE_POLICY = {
  /** Teto de dias para um silêncio com prazo. */
  maxSilenceDays: 90,
  /** Silêncio sem prazo é permitido? Não: cegueira permanente é um defeito. */
  allowIndefinite: false,
  /** Teto de tipos silenciados por organização (todos os silenciáveis). */
  maxSilencedKinds: 6,
} as const;

/** Um tipo pode ser silenciado? Acionável e crítico, nunca. */
export function isSilenceableKind(kind: CollabNotificationKind): boolean {
  if (isActionableKind(kind)) return false;
  return severityForKind(kind) !== 'critical';
}

/** Lista canônica (ordenada) dos tipos silenciáveis. */
export const SILENCEABLE_KINDS: readonly CollabNotificationKind[] = Object.freeze(
  (
    [
      'invite_received',
      'invite_accepted',
      'invite_declined',
      'invite_revoked',
      'invite_expired',
      'membership_suspended',
      'membership_reinstated',
      'membership_removed',
    ] as const
  )
    .filter(isSilenceableKind)
    .sort()
);

/**
 * Normaliza a lista pedida pelo cliente — espelho de
 * `public.collab_normalize_silenced_kinds()`.
 *
 * Descarta desconhecidos e não silenciáveis em vez de rejeitar a chamada
 * inteira: o pedido "silencie o que der" de uma UI mais nova contra um banco
 * mais antigo deve silenciar o que dá, não falhar por completo. Ordena e
 * deduplica para que a coluna tenha uma única representação por conjunto —
 * comparação de estado vira igualdade de array.
 */
export function normalizeSilencedKinds(
  kinds: readonly string[] | null | undefined
): CollabNotificationKind[] {
  if (!kinds) return [];
  const allowed = new Set<string>(SILENCEABLE_KINDS);
  const unique = new Set<CollabNotificationKind>();
  for (const kind of kinds) {
    if (allowed.has(kind)) unique.add(kind as CollabNotificationKind);
  }
  return [...unique].sort();
}

export interface SilencePreference {
  /** Tipos silenciados nesta organização (já normalizados). */
  readonly silencedKinds: readonly CollabNotificationKind[];
  /** Instante em que o silêncio caduca. ISO 8601. */
  readonly silencedUntil: string;
}

/** Motivo pelo qual um aviso continua realçado, apesar de haver preferência. */
export type SilenceVerdict =
  'silenced' | 'not_silenced_kind' | 'not_silenceable' | 'silence_expired' | 'no_preference';

/**
 * Estado efetivo de um aviso — espelho do recorte usado em
 * `public.collab_unread_counts()`.
 *
 * Devolve o motivo, e não um booleano, porque a UI precisa explicar por que um
 * aviso que o usuário jurou ter silenciado continua contando: o prazo venceu,
 * ou o tipo nunca foi silenciável. Booleano transforma isso em suporte.
 */
export function silenceVerdict(input: {
  kind: CollabNotificationKind;
  preference: SilencePreference | null;
  now: Date;
}): SilenceVerdict {
  const { kind, preference, now } = input;
  if (!isSilenceableKind(kind)) return 'not_silenceable';
  if (preference === null) return 'no_preference';
  if (!preference.silencedKinds.includes(kind)) return 'not_silenced_kind';
  if (Date.parse(preference.silencedUntil) <= now.getTime()) return 'silence_expired';
  return 'silenced';
}

/** Conveniência: o aviso deve sair do contador de não lidos? */
export const isSilenced = (input: {
  kind: CollabNotificationKind;
  preference: SilencePreference | null;
  now: Date;
}): boolean => silenceVerdict(input) === 'silenced';

export interface SilenceRequest {
  readonly kinds: readonly string[];
  /** Prazo pedido. Obrigatório: a política não permite silêncio indefinido. */
  readonly until: string | null;
  readonly now: Date;
}

export type SilenceRejection =
  | 'silence_requires_deadline'
  | 'silence_deadline_in_past'
  | 'silence_deadline_too_far'
  | 'silence_no_valid_kind';

export type SilenceResolution =
  | { readonly ok: true; readonly preference: SilencePreference }
  | { readonly ok: false; readonly reason: SilenceRejection };

const DAY_MS = 86_400_000;

/**
 * Valida e normaliza um pedido de silenciamento — espelho de
 * `public.collab_set_notification_silence()`.
 *
 * Limpar o silêncio (lista vazia) é um caminho legítimo e é tratado por
 * `clearSilence`; aqui, pedir prazo sem nenhum tipo válido é erro, porque o
 * usuário acredita ter silenciado algo que continuaria realçado.
 */
export function resolveSilenceRequest(request: SilenceRequest): SilenceResolution {
  const kinds = normalizeSilencedKinds(request.kinds);
  if (kinds.length === 0) return { ok: false, reason: 'silence_no_valid_kind' };
  if (request.until === null) return { ok: false, reason: 'silence_requires_deadline' };

  const until = Date.parse(request.until);
  if (Number.isNaN(until) || until <= request.now.getTime()) {
    return { ok: false, reason: 'silence_deadline_in_past' };
  }
  if (until > request.now.getTime() + COLLAB_SILENCE_POLICY.maxSilenceDays * DAY_MS) {
    return { ok: false, reason: 'silence_deadline_too_far' };
  }

  return {
    ok: true,
    preference: { silencedKinds: kinds, silencedUntil: new Date(until).toISOString() },
  };
}

/** Contagem de não lidos com o silêncio aplicado. */
export function countUnread(
  items: readonly { kind: CollabNotificationKind; read: boolean }[],
  preference: SilencePreference | null,
  now: Date
): { total: number; silenced: number } {
  let total = 0;
  let silenced = 0;
  for (const item of items) {
    if (item.read) continue;
    if (isSilenced({ kind: item.kind, preference, now })) silenced += 1;
    else total += 1;
  }
  return { total, silenced };
}

/** Rótulos legíveis para os tipos silenciáveis (a UI não inventa a lista). */
export type CollabSilenceKindLabel = Readonly<Record<CollabNotificationKind, string>>;
