/**
 * Onda 127 — Rede colaborativa de placas entre organizações.
 *
 * Fonte da verdade em TypeScript das MESMAS regras aplicadas no banco por
 * `public.collab_policy()`, `public.canonical_plate()`,
 * `public.share_collab_plate()` e `public.match_collab_plate()`.
 * A paridade literal é verificada no CI por `scripts/check-collab-network.mjs`.
 *
 * Por que duplicar: a UI precisa dizer "essa placa é inválida" ou "esse
 * compartilhamento expira em 3 dias" sem ida ao servidor. Duplicar sem gate é
 * divergência garantida; com gate, é cache.
 *
 * PRIVACIDADE (LGPD): a rede NUNCA transporta a placa em claro. O que trafega é
 * `plate_hash` = HMAC-SHA256(segredo da rede, placa canônica), calculado no
 * servidor. A organização que recebe só consegue confirmar uma placa que ELA
 * MESMA já leu — não consegue enumerar o que as outras compartilharam.
 */

/** Política da rede colaborativa — espelho de `public.collab_policy()`. */
export const COLLAB_POLICY = {
  /** Validade padrão de um compartilhamento quando o autor não define. */
  defaultTtlDays: 30,
  /** Teto duro: ninguém marca uma placa "para sempre" numa rede de terceiros. */
  maxTtlDays: 180,
  /** Severidade mínima aceita num compartilhamento. */
  minSeverity: 2,
  /** Severidade máxima. */
  maxSeverity: 5,
  /** Silêncio por (rede, entrada, organização que leu) após alertar. */
  matchCooldownSeconds: 900,
  /** Teto de entradas ativas por organização em uma rede. */
  maxActiveEntriesPerOrg: 5_000,
  /** Confiança mínima do OCR para sequer consultar a rede. */
  minConfidence: 0.6,
  /** Comprimento exato da placa canônica brasileira. */
  plateLength: 7,
} as const;

export type CollabSeverity = 2 | 3 | 4 | 5;

/** Estado de participação de uma organização numa rede. */
export type MembershipStatus = 'pending' | 'active' | 'suspended';

export type PlateRejection =
  | 'empty'
  | 'bad_length'
  | 'bad_format';

export type ShareRejection =
  | 'invalid_plate'
  | 'member_not_active'
  | 'severity_out_of_range'
  | 'ttl_out_of_range'
  | 'quota_exceeded';

export type MatchRejection =
  | 'invalid_plate'
  | 'low_confidence'
  | 'member_not_active'
  | 'reciprocity_required'
  | 'no_match'
  | 'own_entry'
  | 'entry_revoked'
  | 'entry_expired'
  | 'cooldown';

/**
 * Confusões clássicas do OCR de placa. A correção NÃO é global: depende da
 * posição, porque numa posição alfabética "0" só pode ser "O", e numa posição
 * numérica "O" só pode ser "0". Corrigir globalmente transformaria "BRA2E19"
 * em algo que nunca existiu.
 */
const TO_LETTER: Readonly<Record<string, string>> = Object.freeze({
  '0': 'O',
  '1': 'I',
  '2': 'Z',
  '4': 'A',
  '5': 'S',
  '6': 'G',
  '8': 'B',
});

const TO_DIGIT: Readonly<Record<string, string>> = Object.freeze({
  O: '0',
  Q: '0',
  D: '0',
  I: '1',
  L: '1',
  Z: '2',
  A: '4',
  S: '5',
  G: '6',
  B: '8',
});

/**
 * Máscara das duas gerações de placa brasileira.
 * `A` = alfabético, `N` = numérico, `X` = alfanumérico (posição 5 do Mercosul,
 * onde as duas gerações divergem e não dá para desambiguar sem contexto).
 */
const PLATE_MASK = ['A', 'A', 'A', 'N', 'X', 'N', 'N'] as const;

export interface PlateResult {
  readonly ok: boolean;
  readonly plate: string | null;
  readonly rejection: PlateRejection | null;
}

const OK_PLATE = (plate: string): PlateResult => ({ ok: true, plate, rejection: null });
const BAD_PLATE = (rejection: PlateRejection): PlateResult => ({
  ok: false,
  plate: null,
  rejection,
});

/**
 * Canonicaliza uma leitura de placa — espelho de `public.canonical_plate()`.
 *
 * Determinístico e idempotente: `canonicalPlate(canonicalPlate(x)) === canonicalPlate(x)`.
 * Isso não é preciosismo — se não fosse idempotente, a mesma placa geraria dois
 * hashes diferentes e a rede simplesmente não casaria nada.
 */
export function canonicalPlate(raw: unknown): PlateResult {
  if (typeof raw !== 'string') return BAD_PLATE('empty');

  // Remove tudo que não é alfanumérico ASCII e normaliza caixa.
  const stripped = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (stripped.length === 0) return BAD_PLATE('empty');
  if (stripped.length !== COLLAB_POLICY.plateLength) return BAD_PLATE('bad_length');

  let out = '';
  for (let i = 0; i < COLLAB_POLICY.plateLength; i += 1) {
    const ch = stripped[i] ?? '';
    const slot = PLATE_MASK[i] ?? 'X';

    if (slot === 'A') {
      const fixed = ch >= 'A' && ch <= 'Z' ? ch : TO_LETTER[ch];
      if (fixed === undefined) return BAD_PLATE('bad_format');
      out += fixed;
    } else if (slot === 'N') {
      const fixed = ch >= '0' && ch <= '9' ? ch : TO_DIGIT[ch];
      if (fixed === undefined) return BAD_PLATE('bad_format');
      out += fixed;
    } else {
      // Posição ambígua: aceita como veio, sem inventar correção.
      out += ch;
    }
  }

  return OK_PLATE(out);
}

/** Normaliza o TTL pedido para dentro da faixa permitida. */
export function clampTtlDays(requested: unknown): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) {
    return COLLAB_POLICY.defaultTtlDays;
  }
  const truncated = Math.trunc(requested);
  if (truncated < 1) return 1;
  if (truncated > COLLAB_POLICY.maxTtlDays) return COLLAB_POLICY.maxTtlDays;
  return truncated;
}

export interface ShareInput {
  readonly plate: unknown;
  readonly memberStatus: MembershipStatus;
  readonly severity: unknown;
  readonly ttlDays?: unknown;
  /** Entradas ativas que a organização já mantém nesta rede. */
  readonly activeEntries: number;
}

export interface ShareDecision {
  readonly accepted: boolean;
  readonly plate: string | null;
  readonly severity: number | null;
  readonly ttlDays: number | null;
  readonly rejection: ShareRejection | null;
}

/**
 * Decide se um compartilhamento entra na rede — espelho de `share_collab_plate`.
 *
 * Ordem das guardas é deliberada: placa inválida é recusada ANTES de checar
 * associação, porque um erro de digitação não deve virar um relatório de
 * "organização suspensa tentou compartilhar".
 */
export function decideShare(input: ShareInput): ShareDecision {
  const reject = (rejection: ShareRejection): ShareDecision => ({
    accepted: false,
    plate: null,
    severity: null,
    ttlDays: null,
    rejection,
  });

  const plate = canonicalPlate(input.plate);
  if (!plate.ok) return reject('invalid_plate');
  if (input.memberStatus !== 'active') return reject('member_not_active');

  const severity =
    typeof input.severity === 'number' && Number.isFinite(input.severity)
      ? Math.trunc(input.severity)
      : Number.NaN;
  if (
    !Number.isFinite(severity) ||
    severity < COLLAB_POLICY.minSeverity ||
    severity > COLLAB_POLICY.maxSeverity
  ) {
    return reject('severity_out_of_range');
  }

  if (input.ttlDays !== undefined && input.ttlDays !== null) {
    if (typeof input.ttlDays !== 'number' || !Number.isFinite(input.ttlDays)) {
      return reject('ttl_out_of_range');
    }
    if (Math.trunc(input.ttlDays) < 1 || Math.trunc(input.ttlDays) > COLLAB_POLICY.maxTtlDays) {
      return reject('ttl_out_of_range');
    }
  }

  if (
    !Number.isFinite(input.activeEntries) ||
    input.activeEntries >= COLLAB_POLICY.maxActiveEntriesPerOrg
  ) {
    return reject('quota_exceeded');
  }

  return {
    accepted: true,
    plate: plate.plate,
    severity,
    ttlDays: clampTtlDays(input.ttlDays ?? COLLAB_POLICY.defaultTtlDays),
    rejection: null,
  };
}

export interface CandidateEntry {
  readonly entryId: string;
  /** Organização que compartilhou a entrada. */
  readonly ownerOrgId: string;
  readonly severity: number;
  /** Epoch ms. */
  readonly expiresAt: number;
  readonly revokedAt: number | null;
  /** Epoch ms do último alerta desta entrada para a organização que leu. */
  readonly lastAlertedAt: number | null;
}

export interface MatchInput {
  readonly plate: unknown;
  readonly confidence: number;
  readonly memberStatus: MembershipStatus;
  /** A rede exige contrapartida de dados? */
  readonly reciprocityRequired: boolean;
  /** A organização que está lendo contribui com dados? */
  readonly sharesData: boolean;
  /** Organização que está lendo a placa agora. */
  readonly readerOrgId: string;
  readonly candidates: readonly CandidateEntry[];
  /** Epoch ms. */
  readonly now: number;
}

export interface MatchDecision {
  readonly alert: boolean;
  readonly entryId: string | null;
  readonly severity: number | null;
  readonly rejection: MatchRejection | null;
}

const NO_MATCH = (rejection: MatchRejection): MatchDecision => ({
  alert: false,
  entryId: null,
  severity: null,
  rejection,
});

/**
 * Decide se uma leitura dispara alerta colaborativo — espelho de `match_collab_plate`.
 *
 * Regras que custaram caro para acertar:
 * - A própria organização não é alertada pela entrada que ela mesma criou;
 *   caso contrário toda ronda interna vira alerta de rede.
 * - Entre várias entradas válidas, vence a de MAIOR severidade; empate resolve
 *   pela que expira antes (mais urgente), e depois por `entryId` para que o
 *   resultado seja determinístico e o gate SQL↔TS possa compará-lo.
 * - Cooldown é a ÚLTIMA guarda: só silencia algo que de fato casou. Aplicá-lo
 *   antes faria uma entrada em cooldown mascarar outra mais grave.
 */
export function decideMatch(input: MatchInput): MatchDecision {
  const plate = canonicalPlate(input.plate);
  if (!plate.ok) return NO_MATCH('invalid_plate');

  if (!Number.isFinite(input.confidence) || input.confidence < COLLAB_POLICY.minConfidence) {
    return NO_MATCH('low_confidence');
  }
  if (input.memberStatus !== 'active') return NO_MATCH('member_not_active');
  if (input.reciprocityRequired && !input.sharesData) return NO_MATCH('reciprocity_required');

  const candidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (candidates.length === 0) return NO_MATCH('no_match');

  let sawOwn = false;
  let sawRevoked = false;
  let sawExpired = false;
  const eligible: CandidateEntry[] = [];

  for (const candidate of candidates) {
    if (candidate.ownerOrgId === input.readerOrgId) {
      sawOwn = true;
      continue;
    }
    if (candidate.revokedAt !== null && candidate.revokedAt <= input.now) {
      sawRevoked = true;
      continue;
    }
    if (candidate.expiresAt <= input.now) {
      sawExpired = true;
      continue;
    }
    eligible.push(candidate);
  }

  if (eligible.length === 0) {
    if (sawExpired) return NO_MATCH('entry_expired');
    if (sawRevoked) return NO_MATCH('entry_revoked');
    if (sawOwn) return NO_MATCH('own_entry');
    return NO_MATCH('no_match');
  }

  const sorted = [...eligible].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    if (a.expiresAt !== b.expiresAt) return a.expiresAt - b.expiresAt;
    return a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0;
  });

  const winner = sorted[0];
  if (winner === undefined) return NO_MATCH('no_match');
  const cooldownMs = COLLAB_POLICY.matchCooldownSeconds * 1_000;
  if (winner.lastAlertedAt !== null && input.now - winner.lastAlertedAt < cooldownMs) {
    return NO_MATCH('cooldown');
  }

  return {
    alert: true,
    entryId: winner.entryId,
    severity: winner.severity,
    rejection: null,
  };
}
