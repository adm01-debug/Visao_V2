/**
 * Onda 218 — Pré-validação do formulário de esquema de alarme.
 *
 * O formulário **não** cria uma segunda régua: ele traduz o que o operador
 * digitou para o `AlarmSchemeDraft` da Onda 215 e submete o resultado à mesma
 * `diagnoseScheme`. O que este módulo acrescenta é a decisão de *admissão* —
 * quando gravar, quando recusar e o que dizer.
 *
 * Três armadilhas justificam o módulo existir separado do diagnóstico:
 *
 *  • **O banco conta diferente do diagnóstico.** `diagnoseScheme` aplica o teto
 *    de 36 canais (S5) sobre as ações *viáveis* — ações mortas e canais
 *    removidos já saíram da conta. O trigger `enforce_alarm_scheme_rules`
 *    conta o JSON **cru** que será gravado, incluindo canais removidos. Um
 *    cadastro pode, portanto, passar no diagnóstico e ser recusado pelo banco
 *    com um erro de SQL bruto. `storedChannelTotal` espelha a contagem do
 *    servidor byte a byte, para que a recusa seja *nossa*, nomeada e em
 *    português — nunca um 23514 vazando na tela.
 *  • **Degradar não é impedir.** Origem parcialmente removida, agenda truncada
 *    ou biblioteca ignorada são achados que o operador precisa **ver antes de
 *    gravar**, mas que não podem travar o cadastro: a Onda 216 já decidiu que
 *    apagar/impedir é pior que avisar em destaque.
 *  • **Gravar em silêncio é a pior falha.** Se a régua recusa ações por
 *    estouro de teto, elas são **nomeadas** na recusa. Nada é truncado para
 *    "caber".
 *
 * Leis (F1..F6):
 *
 *  F1. Achado `blocking` recusa a gravação. É o espelho antecipado dos CHECKs
 *      e do trigger — a UI nunca tenta gravar algo que o banco rejeitaria.
 *  F2. Achado `degrading` **nunca** recusa; vira aviso exibido antes de gravar.
 *  F3. Estouro do teto pela contagem **do banco** (JSON cru) recusa e nomeia as
 *      ações responsáveis, mesmo quando o diagnóstico já as havia descartado.
 *  F4. O payload gravado é derivado do mesmo rascunho julgado. Não existe
 *      caminho entre "julgar" e "gravar" em que os dados mudem.
 *  F5. Entrada hostil nunca lança: texto vira lista vazia, número inválido vira
 *      `null`, e o julgamento segue.
 *  F6. Limiar de desconexão só é persistido para `device_disconnected`; em
 *      qualquer outro tipo vai `null`, para não guardar um número que ninguém
 *      lê (e que mentiria numa auditoria futura).
 *
 * Puro, determinístico, sem rede e sem relógio.
 */

import {
  DISCONNECT_THRESHOLD_DEFAULT_S,
  MAX_EVENT_CHANNELS,
  diagnoseScheme,
  type AlarmActionDraft,
  type AlarmActionKind,
  type AlarmSchemeDraft,
  type SchemeContext,
  type SchemeDiagnosis,
  type SchemeIssue,
} from './alarmScheme';
import {
  diagnoseScheduleForm,
  emptyScheduleForm,
  formToSchedule,
  scheduleToForm,
  type ScheduleDiagnosis,
  type ScheduleFormState,
} from './alarmScheduleForm';
import type { AlarmSchedule } from './alarmAggregation';

/* ------------------------------------------------------------------ *
 * Estado do formulário (tudo texto: é o que o campo devolve)
 * ------------------------------------------------------------------ */

export interface AlarmActionFormRow {
  readonly id: string;
  readonly kind: AlarmActionKind;
  /** Lista livre: vírgula, ponto-e-vírgula ou quebra de linha. */
  readonly displayChannels: string;
  readonly recordChannels: string;
  readonly missingChannels: string;
}

export interface AlarmSchemeFormState {
  /** Ausente = criação; presente = edição. */
  readonly id: string | null;
  readonly name: string;
  readonly enabled: boolean;
  readonly eventType: string;
  readonly sources: string;
  readonly missingSources: string;
  readonly faceLibraries: string;
  /** Texto: campo numérico devolve string, inclusive vazia. */
  readonly disconnectThresholdS: string;
  readonly actions: readonly AlarmActionFormRow[];
  /** Onda 221 — agenda semanal editável (S8). Vazia = 24×7 declarado. */
  readonly schedule: ScheduleFormState;
}

export const ALARM_ACTION_LABEL: Record<AlarmActionKind, string> = {
  display_live: 'Exibir ao vivo',
  record: 'Gravar',
  snapshot: 'Foto',
  sound: 'Som',
  email: 'E-mail',
  webhook: 'Webhook',
  ptz_preset: 'PTZ (preset)',
  relay_output: 'Saída de relé',
};

export const ALARM_ACTION_KINDS = Object.keys(ALARM_ACTION_LABEL) as readonly AlarmActionKind[];

let rowSeq = 0;
/** Id local da linha de ação. Estável dentro da sessão, nunca vai ao banco como chave. */
export const newActionRowId = (): string => `acao-${++rowSeq}`;

export const emptyActionRow = (): AlarmActionFormRow => ({
  id: newActionRowId(),
  kind: 'display_live',
  displayChannels: '',
  recordChannels: '',
  missingChannels: '',
});

export const emptyFormState = (): AlarmSchemeFormState => ({
  id: null,
  name: '',
  enabled: true,
  eventType: 'motion_detection',
  sources: '',
  missingSources: '',
  faceLibraries: '',
  disconnectThresholdS: '',
  actions: [emptyActionRow()],
  schedule: emptyScheduleForm(),
});

/* ------------------------------------------------------------------ *
 * Conversões (F5: nunca lançam)
 * ------------------------------------------------------------------ */

/** Aceita vírgula, ponto-e-vírgula, quebra de linha. Deduplica preservando ordem. */
export function parseIdList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of raw.split(/[,;\n\r\t]+/)) {
    const id = piece.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

const parseThreshold = (raw: unknown): number | null => {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (text.length === 0) return null;
  const value = Number(text);
  return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
};

/** F4 — o rascunho julgado é exatamente o que vira payload. */
export function formToDraft(form: AlarmSchemeFormState): AlarmSchemeDraft {
  const actions: AlarmActionDraft[] = form.actions.map((row) => ({
    id: row.id,
    kind: row.kind,
    displayChannelIds: parseIdList(row.displayChannels),
    recordChannelIds: parseIdList(row.recordChannels),
    missingChannelIds: parseIdList(row.missingChannels),
  }));

  const threshold = parseThreshold(form.disconnectThresholdS);

  return {
    id: form.id ?? '',
    name: typeof form.name === 'string' ? form.name : '',
    enabled: form.enabled === true,
    eventType: typeof form.eventType === 'string' ? form.eventType : '',
    sourceIds: parseIdList(form.sources),
    missingSourceIds: parseIdList(form.missingSources),
    actions,
    schedule: formToSchedule(form.schedule),
    faceLibraryIds: parseIdList(form.faceLibraries),
    // NaN é entrada hostil: vira "fora da faixa" no diagnóstico (S10), não crash.
    disconnectThresholdS: threshold,
  };
}

/**
 * F3 — espelho exato de `public.alarm_scheme_channel_total(jsonb)`.
 *
 * O banco soma `displayChannelIds` + `recordChannelIds` de **todas** as ações
 * do JSON gravado, sem saber quais canais foram removidos. Se contarmos
 * diferente, o INSERT quebra com erro bruto depois de a UI dizer "ok".
 */
export function storedChannelTotal(draft: AlarmSchemeDraft): number {
  let total = 0;
  for (const action of draft.actions ?? []) {
    total += action?.displayChannelIds?.length ?? 0;
    total += action?.recordChannelIds?.length ?? 0;
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * Admissão
 * ------------------------------------------------------------------ */

export type AdmissionRefusalCode =
  | 'blocking_issues'
  | 'stored_channel_budget_exceeded'
  | 'schedule_invalid';

export interface AlarmSchemeAdmission {
  readonly allowed: boolean;
  readonly diagnosis: SchemeDiagnosis;
  /** Achados que impedem a gravação (F1). */
  readonly blocking: readonly SchemeIssue[];
  /** Achados que o operador vê e mesmo assim pode gravar (F2). */
  readonly degrading: readonly SchemeIssue[];
  readonly refusals: readonly { code: AdmissionRefusalCode; message: string; refs: readonly string[] }[];
  /** Contagem que o banco fará (F3), para exibir junto ao teto. */
  readonly storedTotal: number;
  readonly storedLimit: number;
  /** Onda 221 — diagnóstico da agenda (recusa antes do truncamento silencioso). */
  readonly schedule: ScheduleDiagnosis;
}

export function admitSchemeSubmission(
  form: AlarmSchemeFormState,
  context: SchemeContext = {},
): AlarmSchemeAdmission {
  const draft = formToDraft(form);
  const diagnosis = diagnoseScheme(draft, context);

  const blocking = diagnosis.issues.filter((i) => i.severity === 'blocking');
  const degrading = diagnosis.issues.filter((i) => i.severity === 'degrading');

  const refusals: { code: AdmissionRefusalCode; message: string; refs: readonly string[] }[] = [];

  if (blocking.length > 0) {
    refusals.push({
      code: 'blocking_issues',
      message:
        'O cadastro tem impedimentos que o banco também recusaria. Corrija antes de gravar.',
      refs: blocking.map((i) => i.code),
    });
  }

  const storedTotal = storedChannelTotal(draft);
  if (storedTotal > MAX_EVENT_CHANNELS) {
    // Nomeia as ações responsáveis pelo excedente, em ordem estável — nunca
    // "ajusta" a lista para caber.
    const refs: string[] = [];
    let running = 0;
    for (const action of draft.actions) {
      const size = (action.displayChannelIds?.length ?? 0) + (action.recordChannelIds?.length ?? 0);
      if (running + size > MAX_EVENT_CHANNELS) refs.push(action.id);
      else running += size;
    }
    refusals.push({
      code: 'stored_channel_budget_exceeded',
      message: `A gravação somaria ${storedTotal} canais (exibidos + gravados), acima do teto de ${MAX_EVENT_CHANNELS} por evento. Canais de dispositivos removidos também contam para o banco.`,
      refs,
    });
  }

  // G2/G3/G5/G6 — a agenda é recusada aqui, e não truncada por
  // `normalizeSchedule` depois de gravada.
  const schedule = diagnoseScheduleForm(form.schedule);
  if (!schedule.valid) {
    refusals.push({
      code: 'schedule_invalid',
      message: 'A agenda tem períodos que não seriam gravados como você programou. Corrija antes de salvar.',
      refs: schedule.issues.map((i) => i.code),
    });
  }

  return {
    allowed: refusals.length === 0,
    diagnosis,
    blocking,
    degrading,
    refusals,
    storedTotal,
    storedLimit: MAX_EVENT_CHANNELS,
    schedule,
  };
}

/* ------------------------------------------------------------------ *
 * Payload de persistência (Onda 217)
 * ------------------------------------------------------------------ */

export interface AlarmSchemePayload {
  readonly name: string;
  readonly enabled: boolean;
  readonly event_type: string;
  readonly source_ids: string[];
  readonly missing_source_ids: string[];
  readonly actions: AlarmActionDraft[];
  readonly face_library_ids: string[];
  readonly disconnect_threshold_s: number | null;
  readonly schedule: AlarmSchedule | null;
}

/** F4/F6 — deriva do mesmo rascunho julgado; limiar só para desconexão. */
export function draftToPayload(draft: AlarmSchemeDraft): AlarmSchemePayload {
  const isDisconnect = draft.eventType === 'device_disconnected';
  const raw = draft.disconnectThresholdS;
  const threshold =
    isDisconnect && typeof raw === 'number' && Number.isFinite(raw)
      ? Math.trunc(raw)
      : isDisconnect
        ? DISCONNECT_THRESHOLD_DEFAULT_S
        : null;

  return {
    name: draft.name.trim(),
    enabled: draft.enabled === true,
    event_type: draft.eventType,
    source_ids: [...draft.sourceIds],
    missing_source_ids: [...(draft.missingSourceIds ?? [])],
    actions: draft.actions.map((a) => ({
      id: a.id,
      kind: a.kind,
      displayChannelIds: [...(a.displayChannelIds ?? [])],
      recordChannelIds: [...(a.recordChannelIds ?? [])],
      missingChannelIds: [...(a.missingChannelIds ?? [])],
    })),
    face_library_ids: [...(draft.faceLibraryIds ?? [])],
    disconnect_threshold_s: threshold,
    schedule: (draft.schedule ?? null) as AlarmSchedule | null,
  };
}

/** Reidrata o formulário a partir de uma linha já persistida (edição). */
export function draftToForm(draft: AlarmSchemeDraft): AlarmSchemeFormState {
  const actions = draft.actions.map((a) => ({
    id: a.id || newActionRowId(),
    kind: a.kind,
    displayChannels: (a.displayChannelIds ?? []).join(', '),
    recordChannels: (a.recordChannelIds ?? []).join(', '),
    missingChannels: (a.missingChannelIds ?? []).join(', '),
  }));

  return {
    id: draft.id || null,
    name: draft.name,
    enabled: draft.enabled,
    eventType: draft.eventType,
    sources: draft.sourceIds.join(', '),
    missingSources: (draft.missingSourceIds ?? []).join(', '),
    faceLibraries: (draft.faceLibraryIds ?? []).join(', '),
    disconnectThresholdS:
      typeof draft.disconnectThresholdS === 'number' && Number.isFinite(draft.disconnectThresholdS)
        ? String(draft.disconnectThresholdS)
        : '',
    actions: actions.length > 0 ? actions : [emptyActionRow()],
    schedule: scheduleToForm(draft.schedule ?? null),
  };
}
