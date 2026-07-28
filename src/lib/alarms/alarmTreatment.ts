/**
 * Onda 177 — tratativa de alarme (paridade com a tela "Alarme" do SIM Next).
 *
 * O SIM Next não trata alarme como notificação: trata como **pendência com
 * dono e desfecho**. Nosso `event_alerts` tinha o estado, mas não tinha a
 * regra: qualquer cliente podia pular de `open` para `resolved` sem autor e
 * sem motivo — o que transforma o histórico de alarmes em ficção.
 *
 * Este módulo é a regra única da transição. O banco (trigger + RPC) é o
 * espelho servidor desta mesma tabela-verdade; a UI apenas consulta.
 *
 * Regras invioláveis:
 *
 *  1. **Transição legal ou nada.** `open → acknowledged | dismissed`,
 *     `acknowledged → resolved | dismissed`, e reabertura de
 *     `resolved | dismissed → open` apenas por reincidência. Pular o
 *     reconhecimento e "resolver" direto esconderia que ninguém olhou.
 *  2. **Desfecho exige motivo.** `resolved` e `dismissed` só com nota não
 *     vazia (mín. 3 caracteres úteis) e código de desfecho conhecido.
 *     Encerrar em silêncio é o mesmo que apagar o alarme.
 *  3. **Desfecho exige autor.** Sem `actorId` não há tratativa — o histórico
 *     precisa responder "quem".
 *  4. **Nada de retrocesso silencioso.** `acknowledged → open` só via
 *     reabertura explícita (reincidência), que é um fato novo, não um desfazer.
 *  5. **Relógio nunca anda para trás.** Um carimbo anterior ao anterior é
 *     normalizado para o último conhecido: preferimos duração zero a duração
 *     negativa no relatório.
 *  6. **Falso positivo é desfecho de primeira classe.** `dismissed` com código
 *     `false_positive` alimenta a curva de qualidade da detecção; forçar o
 *     operador a "resolver" um ruído contaminaria as métricas de incidente.
 *  7. **Puro e imutável.** Sem `Date.now()`, sem rede; a entrada nunca é
 *     mutada e transição inválida devolve recusa explicada, nunca exceção.
 */

export type AlarmStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export type AlarmAction = 'acknowledge' | 'resolve' | 'dismiss' | 'reopen';

/** Códigos de desfecho aceitos (regra 2/6). */
export type AlarmResolutionCode =
  | 'incident_confirmed'
  | 'handled_on_site'
  | 'no_action_needed'
  | 'false_positive'
  | 'duplicate'
  | 'test';

export const RESOLUTION_CODES: readonly AlarmResolutionCode[] = [
  'incident_confirmed',
  'handled_on_site',
  'no_action_needed',
  'false_positive',
  'duplicate',
  'test',
] as const;

/** Códigos que só fazem sentido ao descartar (regra 6). */
const DISMISS_ONLY: ReadonlySet<AlarmResolutionCode> = new Set([
  'false_positive',
  'duplicate',
  'test',
]);

/** Códigos que só fazem sentido ao resolver. */
const RESOLVE_ONLY: ReadonlySet<AlarmResolutionCode> = new Set([
  'incident_confirmed',
  'handled_on_site',
  'no_action_needed',
]);

export const MIN_NOTE_LENGTH = 3;
export const MAX_NOTE_LENGTH = 2000;

/** Transições legais (regra 1). */
const LEGAL: Readonly<Record<AlarmStatus, readonly AlarmAction[]>> = {
  open: ['acknowledge', 'dismiss'],
  acknowledged: ['resolve', 'dismiss'],
  resolved: ['reopen'],
  dismissed: ['reopen'],
};

export type TreatmentRejection =
  | 'illegal_transition'
  | 'missing_actor'
  | 'missing_note'
  | 'note_too_long'
  | 'invalid_code'
  | 'code_not_allowed_for_action'
  | 'unknown_status';

export interface AlarmSnapshot {
  status: AlarmStatus;
  acknowledgedAt?: number | null;
  acknowledgedBy?: string | null;
  resolvedAt?: number | null;
  resolvedBy?: string | null;
  /** Último carimbo aplicado — base da regra 5. */
  updatedAt?: number | null;
}

export interface TreatmentIntent {
  action: AlarmAction;
  actorId?: string | null;
  note?: string | null;
  code?: string | null;
  now: number;
}

export interface TreatmentAccepted {
  ok: true;
  from: AlarmStatus;
  to: AlarmStatus;
  action: AlarmAction;
  actorId: string;
  at: number;
  note: string | null;
  code: AlarmResolutionCode | null;
  /** Estado resultante, já com carimbos normalizados (regra 5). */
  next: Required<AlarmSnapshot>;
}

export interface TreatmentRejected {
  ok: false;
  reason: TreatmentRejection;
  /** Texto pronto para a UI — em português, sem jargão de banco. */
  message: string;
}

export type TreatmentResult = TreatmentAccepted | TreatmentRejected;

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const TARGET: Readonly<Record<AlarmAction, AlarmStatus>> = {
  acknowledge: 'acknowledged',
  resolve: 'resolved',
  dismiss: 'dismissed',
  reopen: 'open',
};

const REJECTION_MESSAGE: Record<TreatmentRejection, string> = {
  illegal_transition: 'Transição não permitida para o estado atual do alarme.',
  missing_actor: 'É preciso identificar quem está tratando o alarme.',
  missing_note: 'Informe o motivo do desfecho (mínimo de 3 caracteres).',
  note_too_long: 'O motivo excede o tamanho máximo permitido.',
  invalid_code: 'Código de desfecho desconhecido.',
  code_not_allowed_for_action: 'Este código de desfecho não vale para esta ação.',
  unknown_status: 'Estado atual do alarme é desconhecido.',
};

const reject = (reason: TreatmentRejection): TreatmentRejected => ({
  ok: false,
  reason,
  message: REJECTION_MESSAGE[reason],
});

/** Ações legais a partir de um estado — usada pela UI para desabilitar botões. */
export function allowedActions(status: AlarmStatus | string | null | undefined): AlarmAction[] {
  if (typeof status !== 'string' || !(status in LEGAL)) return [];
  return [...LEGAL[status as AlarmStatus]];
}

export const isClosingAction = (action: AlarmAction): boolean =>
  action === 'resolve' || action === 'dismiss';

/** Códigos aceitos para uma ação de encerramento (regra 6). */
export function allowedCodes(action: AlarmAction): AlarmResolutionCode[] {
  if (action === 'resolve') return [...RESOLVE_ONLY] as AlarmResolutionCode[];
  if (action === 'dismiss') return [...DISMISS_ONLY] as AlarmResolutionCode[];
  return [];
}

/** Normaliza a nota: recorta espaços, colapsa quebras redundantes. */
export function normalizeNote(note: string | null | undefined): string {
  if (typeof note !== 'string') return '';
  return note.replace(/\s+/g, ' ').trim();
}

/**
 * Avalia uma intenção de tratativa contra o estado atual.
 *
 * Nunca lança: entrada inválida vira recusa explicada. Uma exceção aqui
 * viraria "erro inesperado" na tela e o operador ficaria sem saber o que
 * corrigir — e o alarme, sem tratativa.
 */
export function evaluateTreatment(
  snapshot: AlarmSnapshot,
  intent: TreatmentIntent,
): TreatmentResult {
  const from = snapshot?.status;
  if (typeof from !== 'string' || !(from in LEGAL)) return reject('unknown_status');

  const action = intent?.action;
  if (typeof action !== 'string' || !(action in TARGET)) return reject('illegal_transition');
  if (!LEGAL[from].includes(action)) return reject('illegal_transition');

  const actorId = typeof intent.actorId === 'string' ? intent.actorId.trim() : '';
  if (actorId.length === 0) return reject('missing_actor');

  const closing = isClosingAction(action);
  const note = normalizeNote(intent.note);
  let code: AlarmResolutionCode | null = null;

  if (closing) {
    if (note.length < MIN_NOTE_LENGTH) return reject('missing_note');
    if (note.length > MAX_NOTE_LENGTH) return reject('note_too_long');
    const raw = typeof intent.code === 'string' ? intent.code.trim() : '';
    if (!RESOLUTION_CODES.includes(raw as AlarmResolutionCode)) return reject('invalid_code');
    code = raw as AlarmResolutionCode;
    if (!allowedCodes(action).includes(code)) return reject('code_not_allowed_for_action');
  } else if (note.length > MAX_NOTE_LENGTH) {
    return reject('note_too_long');
  }

  // Regra 5: o carimbo nunca retrocede em relação ao último conhecido.
  const previous = isClock(snapshot.updatedAt) ? snapshot.updatedAt : null;
  const raw = isClock(intent.now) ? intent.now : (previous ?? 0);
  const at = previous != null ? Math.max(raw, previous) : raw;

  const to = TARGET[action];
  const next: Required<AlarmSnapshot> = {
    status: to,
    acknowledgedAt:
      action === 'acknowledge'
        ? at
        : action === 'reopen'
          ? null
          : (snapshot.acknowledgedAt ?? null),
    acknowledgedBy:
      action === 'acknowledge'
        ? actorId
        : action === 'reopen'
          ? null
          : (snapshot.acknowledgedBy ?? null),
    resolvedAt: closing ? at : action === 'reopen' ? null : (snapshot.resolvedAt ?? null),
    resolvedBy: closing ? actorId : action === 'reopen' ? null : (snapshot.resolvedBy ?? null),
    updatedAt: at,
  };

  return {
    ok: true,
    from,
    to,
    action,
    actorId,
    at,
    note: note.length > 0 ? note : null,
    code,
    next,
  };
}

const ACTION_LABEL: Record<AlarmAction, string> = {
  acknowledge: 'reconhecer',
  resolve: 'resolver',
  dismiss: 'descartar',
  reopen: 'reabrir',
};

const STATUS_LABEL: Record<AlarmStatus, string> = {
  open: 'aberto',
  acknowledged: 'em tratativa',
  resolved: 'resolvido',
  dismissed: 'descartado',
};

const CODE_LABEL: Record<AlarmResolutionCode, string> = {
  incident_confirmed: 'ocorrência confirmada',
  handled_on_site: 'atendido no local',
  no_action_needed: 'sem necessidade de ação',
  false_positive: 'falso positivo',
  duplicate: 'duplicado',
  test: 'teste',
};

export const alarmActionLabel = (action: AlarmAction): string => ACTION_LABEL[action] ?? action;
export const alarmStatusLabel = (status: AlarmStatus): string => STATUS_LABEL[status] ?? status;
export const resolutionCodeLabel = (code: AlarmResolutionCode): string =>
  CODE_LABEL[code] ?? String(code);

/** Desfechos que contam como ruído da detecção (regra 6). */
export const isNoiseOutcome = (code: AlarmResolutionCode | null | undefined): boolean =>
  code === 'false_positive' || code === 'duplicate' || code === 'test';
