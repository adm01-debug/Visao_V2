/**
 * Onda 215 — Esquema de alarme (paridade com "Configuração de alarme" do SIM Next).
 *
 * A Onda 178 resolveu o *comportamento* do alarme (OR abre, AND fecha, agenda,
 * rearme). O que faltava é o **cadastro**: o esquema que amarra tipo de evento,
 * origens, ações e agenda — e que precisa ser julgado *antes* de qualquer
 * disparo. O manual é explícito ao dizer que um esquema com dispositivo
 * removido não some: ele fica marcado como inconsistente, em destaque, até
 * alguém corrigir. Apagar é pior que avisar.
 *
 * Três armadilhas justificam este módulo existir separado:
 *
 *  • **Esquema sem ação não é esquema.** Um cadastro que dispara e não executa
 *    nada é um alarme silencioso — a pior falha possível num sistema de
 *    monitoramento, porque o operador acredita estar coberto.
 *  • **Duplicidade IA / não-IA.** O manual avisa: no mesmo canal, cadastrar
 *    "linha virtual" e "linha virtual com IA" executa as ações duas vezes.
 *    Isso não é erro de configuração detectável por schema — é colisão entre
 *    dois cadastros válidos, e só se vê olhando o conjunto.
 *  • **Teto de canais.** A soma de canais *exibidos* + *gravados* por evento
 *    não pode passar de 36. Truncar em silêncio faria o operador acreditar que
 *    gravou o que não gravou.
 *
 * Leis invioláveis (S1..S10):
 *
 *  S1. Nome é obrigatório (≥1 caractere útil, ≤120). Cadastro anônimo não é
 *      auditável.
 *  S2. Tipo fora do catálogo torna o esquema **inoperante** — nunca é tratado
 *      como um tipo genérico "qualquer evento".
 *  S3. Perder *parte* das origens degrada (inconsistente) e segue protegendo o
 *      que sobrou; perder **todas** torna inoperante.
 *  S4. O mesmo vale para ações — e esquema sem nenhuma ação viável é
 *      inoperante, jamais "ok e silencioso".
 *  S5. Teto de 36 canais por evento, contando exibição **e** gravação
 *      separadamente (o mesmo canal nas duas conta 2). O excedente é recusado
 *      em ordem estável e **nomeado**; nunca truncado em silêncio.
 *  S6. `face_recognized` exige exatamente **uma** biblioteca de faces, e ela
 *      precisa pertencer a um dispositivo de origem do esquema. Nenhum outro
 *      tipo aceita biblioteca.
 *  S7. Duplicidade IA/não-IA é declarada como achado do **conjunto**, nunca
 *      desativa nenhum dos dois esquemas por conta própria.
 *  S8. Agenda: até 6 períodos por dia; ausente/vazia = 24×7 (mesma régua da
 *      Onda 178, reaproveitada — não reimplementada).
 *  S9. Desabilitado é um **eixo separado** do diagnóstico: um esquema
 *      desligado continua exibindo suas inconsistências, senão o operador
 *      "conserta" o aviso desligando a regra.
 * S10. `device_disconnected` tem limiar próprio (padrão 180s, faixa 30..3600) e
 *      **nunca** dispara por desconexão manual — desligar o dispositivo de
 *      propósito não é anormalidade.
 *
 * Puro, determinístico, sem relógio próprio e sem rede. Nunca lança: entrada
 * hostil vira achado, não exceção.
 */

import {
  MAX_PERIODS_PER_DAY,
  normalizeSchedule,
  type AlarmSchedule,
  type SchedulePeriod,
} from './alarmAggregation';

/* ------------------------------------------------------------------ *
 * Catálogo de eventos
 * ------------------------------------------------------------------ */

export type AlarmEventType =
  | 'motion_detection'
  | 'tampering'
  | 'video_loss'
  | 'disk_full'
  | 'disk_error'
  | 'device_disconnected'
  | 'external_alarm'
  | 'abandoned_object'
  | 'missing_object'
  | 'tripwire'
  | 'intrusion'
  | 'scene_change'
  | 'audio_detection'
  | 'face_detected'
  | 'face_recognized'
  | 'face_unrecognized'
  | 'plate_read'
  | 'plate_allowed'
  | 'plate_denied'
  | 'tripwire_ai'
  | 'intrusion_ai';

export interface AlarmEventSpec {
  readonly type: AlarmEventType;
  readonly label: string;
  /** Par IA/não-IA: cadastrar ambos no mesmo canal duplica as ações (S7). */
  readonly aiTwin?: AlarmEventType;
  /** `true` quando o próprio evento é a variante com filtro de IA. */
  readonly aiFiltered?: boolean;
  /** Exige exatamente uma biblioteca de faces (S6). */
  readonly requiresFaceLibrary?: boolean;
}

const CATALOG: readonly AlarmEventSpec[] = [
  { type: 'motion_detection', label: 'Detecção de movimento' },
  { type: 'tampering', label: 'Mascaramento' },
  { type: 'video_loss', label: 'Perda de vídeo' },
  { type: 'disk_full', label: 'Disco cheio' },
  { type: 'disk_error', label: 'Erro no disco' },
  { type: 'device_disconnected', label: 'Dispositivo desconectado' },
  { type: 'external_alarm', label: 'Alarme externo' },
  { type: 'abandoned_object', label: 'Objeto abandonado' },
  { type: 'missing_object', label: 'Objeto faltando' },
  { type: 'tripwire', label: 'Linha virtual', aiTwin: 'tripwire_ai' },
  { type: 'intrusion', label: 'Cerca virtual', aiTwin: 'intrusion_ai' },
  { type: 'scene_change', label: 'Mudança de cena' },
  { type: 'audio_detection', label: 'Detecção de som' },
  { type: 'face_detected', label: 'Detecção de faces' },
  { type: 'face_recognized', label: 'Face reconhecida', requiresFaceLibrary: true },
  { type: 'face_unrecognized', label: 'Face não reconhecida' },
  { type: 'plate_read', label: 'Leitura de placa' },
  { type: 'plate_allowed', label: 'Leitura de placa autorizada' },
  { type: 'plate_denied', label: 'Leitura de placa não autorizada' },
  { type: 'tripwire_ai', label: 'Linha virtual com IA', aiTwin: 'tripwire', aiFiltered: true },
  { type: 'intrusion_ai', label: 'Cerca virtual com IA', aiTwin: 'intrusion', aiFiltered: true },
];

const CATALOG_BY_TYPE = new Map<string, AlarmEventSpec>(CATALOG.map((s) => [s.type, s]));

export const ALARM_EVENT_CATALOG: readonly AlarmEventSpec[] = CATALOG;

export const findEventSpec = (type: unknown): AlarmEventSpec | null =>
  typeof type === 'string' ? (CATALOG_BY_TYPE.get(type) ?? null) : null;

export const eventLabel = (type: unknown): string => findEventSpec(type)?.label ?? 'Evento desconhecido';

/* ------------------------------------------------------------------ *
 * Limites declarados
 * ------------------------------------------------------------------ */

/** Soma de canais exibidos + gravados por evento (S5). */
export const MAX_EVENT_CHANNELS = 36;
export const MAX_SCHEME_NAME_LENGTH = 120;

/** Limiar de desconexão (S10), em segundos. */
export const DISCONNECT_THRESHOLD_DEFAULT_S = 180;
export const DISCONNECT_THRESHOLD_MIN_S = 30;
export const DISCONNECT_THRESHOLD_MAX_S = 3600;

export { MAX_PERIODS_PER_DAY };

/* ------------------------------------------------------------------ *
 * Entrada
 * ------------------------------------------------------------------ */

export type AlarmActionKind =
  | 'display_live'
  | 'record'
  | 'snapshot'
  | 'sound'
  | 'email'
  | 'webhook'
  | 'ptz_preset'
  | 'relay_output';

export interface AlarmActionDraft {
  readonly id: string;
  readonly kind: AlarmActionKind;
  /** Canais exibidos por esta ação (contam no teto de 36). */
  readonly displayChannelIds?: readonly string[];
  /** Canais gravados por esta ação (contam no teto de 36, somados aos exibidos). */
  readonly recordChannelIds?: readonly string[];
  /** Canais que não existem mais (dispositivo removido) — S4. */
  readonly missingChannelIds?: readonly string[];
}

export interface AlarmSchemeDraft {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly eventType: string;
  /** Canais/dispositivos de origem do evento. */
  readonly sourceIds: readonly string[];
  /** Origens que não existem mais — S3. */
  readonly missingSourceIds?: readonly string[];
  readonly actions: readonly AlarmActionDraft[];
  readonly schedule?: AlarmSchedule | null;
  /** Bibliotecas de faces selecionadas (S6). */
  readonly faceLibraryIds?: readonly string[];
  /** Limiar de desconexão em segundos (S10); ausente = padrão. */
  readonly disconnectThresholdS?: number | null;
}

/** Vínculo biblioteca → dispositivo, para validar S6 sem adivinhar. */
export interface FaceLibraryBinding {
  readonly libraryId: string;
  readonly deviceIds: readonly string[];
}

export interface SchemeContext {
  /** Bibliotecas conhecidas e a quem pertencem. Ausente = não verificável. */
  readonly faceLibraries?: readonly FaceLibraryBinding[];
}

/* ------------------------------------------------------------------ *
 * Saída
 * ------------------------------------------------------------------ */

export type SchemeIssueCode =
  | 'name_missing'
  | 'name_too_long'
  | 'unknown_event_type'
  | 'no_sources'
  | 'sources_partially_missing'
  | 'all_sources_missing'
  | 'no_actions'
  | 'actions_partially_missing'
  | 'all_actions_missing'
  | 'action_without_target'
  | 'channel_budget_exceeded'
  | 'face_library_missing'
  | 'face_library_ambiguous'
  | 'face_library_foreign'
  | 'face_library_not_applicable'
  | 'schedule_periods_truncated'
  | 'schedule_period_invalid'
  | 'disconnect_threshold_out_of_range';

/** `blocking` impede o esquema de funcionar; `degrading` deixa operar reduzido. */
export type IssueSeverity = 'blocking' | 'degrading';

export interface SchemeIssue {
  readonly code: SchemeIssueCode;
  readonly severity: IssueSeverity;
  readonly message: string;
  /** Ids envolvidos (origens, ações, canais) — sempre ordenados. */
  readonly refs: readonly string[];
}

export type SchemeHealth = 'ok' | 'inconsistent' | 'inoperative';

export interface ChannelBudget {
  readonly displayed: number;
  readonly recorded: number;
  readonly total: number;
  readonly limit: number;
  /** Ações recusadas por estouro do teto, em ordem estável (S5). */
  readonly refusedActionIds: readonly string[];
}

export interface SchemeDiagnosis {
  readonly schemeId: string;
  readonly eventType: AlarmEventType | null;
  readonly health: SchemeHealth;
  /** Eixo separado de `health` (S9). */
  readonly enabled: boolean;
  /** Só dispara quando habilitado **e** operante. */
  readonly armed: boolean;
  readonly issues: readonly SchemeIssue[];
  readonly effectiveSourceIds: readonly string[];
  readonly effectiveActionIds: readonly string[];
  readonly budget: ChannelBudget;
  readonly normalizedSchedule: readonly (readonly SchedulePeriod[])[];
  readonly alwaysOn: boolean;
  readonly disconnectThresholdS: number | null;
}

/* ------------------------------------------------------------------ *
 * Utilitários puros
 * ------------------------------------------------------------------ */

const asIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
  }
  return [...seen];
};

const sorted = (ids: readonly string[]): string[] => [...ids].sort();

const issue = (
  code: SchemeIssueCode,
  severity: IssueSeverity,
  message: string,
  refs: readonly string[] = [],
): SchemeIssue => ({ code, severity, message, refs: sorted(refs) });

/* ------------------------------------------------------------------ *
 * Diagnóstico do esquema
 * ------------------------------------------------------------------ */

export function diagnoseScheme(
  draft: AlarmSchemeDraft,
  context: SchemeContext = {},
): SchemeDiagnosis {
  const issues: SchemeIssue[] = [];

  /* S1 — nome */
  const name = typeof draft?.name === 'string' ? draft.name.trim() : '';
  if (name.length === 0) {
    issues.push(issue('name_missing', 'blocking', 'Esquema sem nome não é auditável.'));
  } else if (name.length > MAX_SCHEME_NAME_LENGTH) {
    issues.push(
      issue(
        'name_too_long',
        'degrading',
        `Nome excede ${MAX_SCHEME_NAME_LENGTH} caracteres e será truncado na exibição.`,
      ),
    );
  }

  /* S2 — tipo */
  const spec = findEventSpec(draft?.eventType);
  if (!spec) {
    issues.push(
      issue(
        'unknown_event_type',
        'blocking',
        'Tipo de evento fora do catálogo: o esquema nunca será casado com um evento real.',
        typeof draft?.eventType === 'string' ? [draft.eventType] : [],
      ),
    );
  }

  /* S3 — origens */
  const declaredSources = asIdList(draft?.sourceIds);
  const missingSources = asIdList(draft?.missingSourceIds).filter((id) =>
    declaredSources.includes(id),
  );
  const effectiveSourceIds = declaredSources.filter((id) => !missingSources.includes(id));

  if (declaredSources.length === 0) {
    issues.push(issue('no_sources', 'blocking', 'Esquema sem origem não escuta nada.'));
  } else if (effectiveSourceIds.length === 0) {
    issues.push(
      issue(
        'all_sources_missing',
        'blocking',
        'Todas as origens apontam para dispositivos removidos.',
        missingSources,
      ),
    );
  } else if (missingSources.length > 0) {
    issues.push(
      issue(
        'sources_partially_missing',
        'degrading',
        'Parte das origens aponta para dispositivos removidos; o esquema segue protegendo as demais.',
        missingSources,
      ),
    );
  }

  /* S4 — ações */
  const rawActions = Array.isArray(draft?.actions) ? draft.actions : [];
  const viableActions: AlarmActionDraft[] = [];
  const deadActionIds: string[] = [];
  const partiallyDeadActionIds: string[] = [];
  const targetlessActionIds: string[] = [];
  const seenActionIds = new Set<string>();

  for (const action of rawActions) {
    if (!action || typeof action.id !== 'string') continue;
    const id = action.id.trim();
    if (id.length === 0 || seenActionIds.has(id)) continue;
    seenActionIds.add(id);

    const missing = new Set(asIdList(action.missingChannelIds));
    const display = asIdList(action.displayChannelIds);
    const record = asIdList(action.recordChannelIds);
    const declaredTargets = display.length + record.length;
    const liveDisplay = display.filter((c) => !missing.has(c));
    const liveRecord = record.filter((c) => !missing.has(c));

    if (declaredTargets > 0 && liveDisplay.length + liveRecord.length === 0) {
      // Ação cujos canais sumiram todos: não executa nada.
      deadActionIds.push(id);
      continue;
    }
    if (declaredTargets > liveDisplay.length + liveRecord.length) {
      partiallyDeadActionIds.push(id);
    }
    // Ações sem canal (e-mail, webhook, som) são válidas: agem no servidor.
    if (declaredTargets === 0 && CHANNEL_BOUND_ACTIONS.has(action.kind)) {
      targetlessActionIds.push(id);
      continue;
    }

    viableActions.push({
      ...action,
      id,
      displayChannelIds: liveDisplay,
      recordChannelIds: liveRecord,
      missingChannelIds: [...missing],
    });
  }

  if (rawActions.length === 0) {
    issues.push(
      issue('no_actions', 'blocking', 'Esquema sem ação dispara em silêncio — cobertura falsa.'),
    );
  } else if (viableActions.length === 0) {
    issues.push(
      issue(
        'all_actions_missing',
        'blocking',
        'Nenhuma ação executável: todos os alvos foram removidos.',
        [...deadActionIds, ...targetlessActionIds],
      ),
    );
  } else if (deadActionIds.length > 0 || partiallyDeadActionIds.length > 0) {
    issues.push(
      issue(
        'actions_partially_missing',
        'degrading',
        'Parte das ações perdeu alvos removidos; as demais seguem executando.',
        [...deadActionIds, ...partiallyDeadActionIds],
      ),
    );
  }
  if (targetlessActionIds.length > 0 && viableActions.length > 0) {
    issues.push(
      issue(
        'action_without_target',
        'degrading',
        'Ação que depende de canal foi cadastrada sem nenhum canal.',
        targetlessActionIds,
      ),
    );
  }

  /* S5 — teto de canais */
  let displayed = 0;
  let recorded = 0;
  const refusedActionIds: string[] = [];
  const admittedActionIds: string[] = [];

  for (const action of viableActions) {
    const d = action.displayChannelIds?.length ?? 0;
    const r = action.recordChannelIds?.length ?? 0;
    if (displayed + recorded + d + r > MAX_EVENT_CHANNELS) {
      refusedActionIds.push(action.id);
      continue;
    }
    displayed += d;
    recorded += r;
    admittedActionIds.push(action.id);
  }

  if (refusedActionIds.length > 0) {
    issues.push(
      issue(
        'channel_budget_exceeded',
        'degrading',
        `Teto de ${MAX_EVENT_CHANNELS} canais por evento (exibidos + gravados) atingido: ações excedentes recusadas.`,
        refusedActionIds,
      ),
    );
  }

  const budget: ChannelBudget = {
    displayed,
    recorded,
    total: displayed + recorded,
    limit: MAX_EVENT_CHANNELS,
    refusedActionIds: [...refusedActionIds],
  };

  /* S6 — biblioteca de faces */
  const libraries = asIdList(draft?.faceLibraryIds);
  if (spec?.requiresFaceLibrary) {
    if (libraries.length === 0) {
      issues.push(
        issue(
          'face_library_missing',
          'blocking',
          'Face reconhecida exige uma biblioteca de faces do dispositivo de origem.',
        ),
      );
    } else if (libraries.length > 1) {
      issues.push(
        issue(
          'face_library_ambiguous',
          'blocking',
          'Face reconhecida aceita exatamente uma biblioteca por esquema.',
          libraries,
        ),
      );
    } else if (Array.isArray(context.faceLibraries)) {
      const libraryId = libraries[0]!;
      const binding = context.faceLibraries.find((b) => b?.libraryId === libraryId);
      const owned =
        binding !== undefined &&
        asIdList(binding.deviceIds).some((deviceId) => effectiveSourceIds.includes(deviceId));
      if (!owned) {
        issues.push(
          issue(
            'face_library_foreign',
            'blocking',
            'A biblioteca não pertence a nenhuma origem viva do esquema; o dispositivo nunca reconhecerá essas faces.',
            [libraryId],
          ),
        );
      }
    }
  } else if (libraries.length > 0) {
    issues.push(
      issue(
        'face_library_not_applicable',
        'degrading',
        'Biblioteca de faces é ignorada neste tipo de evento.',
        libraries,
      ),
    );
  }

  /* S8 — agenda */
  const rawSchedule = draft?.schedule ?? null;
  const normalizedSchedule = normalizeSchedule(rawSchedule);
  if (Array.isArray(rawSchedule)) {
    let truncated = 0;
    let invalid = 0;
    rawSchedule.forEach((day, index) => {
      const declared = Array.isArray(day) ? day.length : 0;
      const kept = normalizedSchedule[index]?.length ?? 0;
      if (declared > MAX_PERIODS_PER_DAY) truncated += declared - MAX_PERIODS_PER_DAY;
      const admissible = Math.min(declared, MAX_PERIODS_PER_DAY);
      if (kept < admissible) invalid += admissible - kept;
    });
    if (truncated > 0) {
      issues.push(
        issue(
          'schedule_periods_truncated',
          'degrading',
          `Máximo de ${MAX_PERIODS_PER_DAY} períodos por dia: ${truncated} período(s) descartado(s).`,
        ),
      );
    }
    if (invalid > 0) {
      issues.push(
        issue(
          'schedule_period_invalid',
          'degrading',
          `${invalid} período(s) com horário inválido foram ignorados.`,
        ),
      );
    }
  }
  const alwaysOn = normalizedSchedule.every((day) => day.length === 0);

  /* S10 — limiar de desconexão */
  let disconnectThresholdS: number | null = null;
  if (spec?.type === 'device_disconnected') {
    const raw = draft?.disconnectThresholdS;
    if (raw === null || raw === undefined) {
      disconnectThresholdS = DISCONNECT_THRESHOLD_DEFAULT_S;
    } else if (
      !Number.isFinite(raw) ||
      raw < DISCONNECT_THRESHOLD_MIN_S ||
      raw > DISCONNECT_THRESHOLD_MAX_S
    ) {
      disconnectThresholdS = DISCONNECT_THRESHOLD_DEFAULT_S;
      issues.push(
        issue(
          'disconnect_threshold_out_of_range',
          'degrading',
          `Limiar fora de ${DISCONNECT_THRESHOLD_MIN_S}–${DISCONNECT_THRESHOLD_MAX_S}s; aplicado o padrão de ${DISCONNECT_THRESHOLD_DEFAULT_S}s.`,
        ),
      );
    } else {
      disconnectThresholdS = Math.floor(raw);
    }
  }

  const blocking = issues.some((i) => i.severity === 'blocking');
  const health: SchemeHealth = blocking
    ? 'inoperative'
    : issues.length > 0
      ? 'inconsistent'
      : 'ok';

  const enabled = draft?.enabled === true;

  return {
    schemeId: typeof draft?.id === 'string' ? draft.id : '',
    eventType: spec?.type ?? null,
    health,
    enabled,
    armed: enabled && health !== 'inoperative',
    issues,
    effectiveSourceIds,
    effectiveActionIds: admittedActionIds,
    budget,
    normalizedSchedule,
    alwaysOn,
    disconnectThresholdS,
  };
}

/** Ações cuja execução depende de um canal alvo. */
const CHANNEL_BOUND_ACTIONS: ReadonlySet<AlarmActionKind> = new Set<AlarmActionKind>([
  'display_live',
  'record',
  'snapshot',
  'ptz_preset',
]);

/* ------------------------------------------------------------------ *
 * S7 — duplicidade IA / não-IA no conjunto
 * ------------------------------------------------------------------ */

export interface DuplicatePairing {
  readonly channelId: string;
  readonly plainSchemeId: string;
  readonly aiSchemeId: string;
  readonly plainType: AlarmEventType;
  readonly aiType: AlarmEventType;
  readonly message: string;
}

/**
 * Detecta canais cobertos simultaneamente por um esquema com IA e seu par sem
 * IA — nesses casos as ações executam em duplicidade. Só considera esquemas
 * **armados**: cadastro desligado ou inoperante não duplica nada.
 */
export function detectDuplicatePairings(
  diagnoses: readonly SchemeDiagnosis[],
): DuplicatePairing[] {
  const armed = diagnoses.filter((d) => d.armed && d.eventType !== null);
  const found: DuplicatePairing[] = [];

  for (const ai of armed) {
    const spec = findEventSpec(ai.eventType);
    if (!spec?.aiFiltered || !spec.aiTwin) continue;
    for (const plain of armed) {
      if (plain.eventType !== spec.aiTwin) continue;
      const shared = ai.effectiveSourceIds.filter((id) => plain.effectiveSourceIds.includes(id));
      for (const channelId of sorted(shared)) {
        found.push({
          channelId,
          plainSchemeId: plain.schemeId,
          aiSchemeId: ai.schemeId,
          plainType: plain.eventType as AlarmEventType,
          aiType: ai.eventType as AlarmEventType,
          message: `O canal está coberto por "${eventLabel(plain.eventType)}" e "${eventLabel(ai.eventType)}": as ações executarão em duplicidade.`,
        });
      }
    }
  }

  return found.sort(
    (a, b) =>
      a.channelId.localeCompare(b.channelId) ||
      a.aiSchemeId.localeCompare(b.aiSchemeId) ||
      a.plainSchemeId.localeCompare(b.plainSchemeId),
  );
}

/* ------------------------------------------------------------------ *
 * S10 — admissão do evento de desconexão
 * ------------------------------------------------------------------ */

export type DisconnectCause = 'manual' | 'network' | 'device' | 'unknown';

export interface DisconnectAdmission {
  readonly admitted: boolean;
  readonly reason: 'admitted' | 'manual_disconnect' | 'below_threshold' | 'not_armed' | 'wrong_type';
}

/**
 * Decide se uma desconexão vira alarme. Desconexão manual **nunca** vira:
 * desligar o dispositivo de propósito não é anormalidade — tratar como alarme
 * treinaria o operador a ignorar o aviso.
 */
export function admitDisconnect(
  diagnosis: SchemeDiagnosis,
  observation: { cause: DisconnectCause; offlineForS: number },
): DisconnectAdmission {
  if (diagnosis.eventType !== 'device_disconnected') {
    return { admitted: false, reason: 'wrong_type' };
  }
  if (!diagnosis.armed) return { admitted: false, reason: 'not_armed' };
  if (observation.cause === 'manual') return { admitted: false, reason: 'manual_disconnect' };

  const threshold = diagnosis.disconnectThresholdS ?? DISCONNECT_THRESHOLD_DEFAULT_S;
  const offline = Number.isFinite(observation.offlineForS) ? observation.offlineForS : -1;
  if (offline < threshold) return { admitted: false, reason: 'below_threshold' };

  return { admitted: true, reason: 'admitted' };
}

/* ------------------------------------------------------------------ *
 * Rótulos (PT-BR)
 * ------------------------------------------------------------------ */

const HEALTH_LABEL: Record<SchemeHealth, string> = {
  ok: 'Consistente',
  inconsistent: 'Inconsistente',
  inoperative: 'Inoperante',
};

export const schemeHealthLabel = (health: SchemeHealth): string => HEALTH_LABEL[health] ?? health;

/** Resumo de uma linha da tabela de esquemas. */
export function schemeSummary(diagnosis: SchemeDiagnosis): string {
  if (diagnosis.health === 'inoperative') return 'Inoperante — corrija antes de contar com este alarme';
  if (!diagnosis.enabled) return 'Desabilitado';
  if (diagnosis.health === 'inconsistent') return 'Operando com ressalvas';
  return 'Operando';
}
