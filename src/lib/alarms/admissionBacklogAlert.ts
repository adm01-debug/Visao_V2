/**
 * Onda 232 — Fan-in do passivo do expurgo do livro de admissão.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 231 deu **visibilidade** ao passivo (`deferred_count`) da rotina de
 * expurgo: o cartão em `/manutencao` mostra quando o teto de lote está
 * perdendo a corrida. Mas visibilidade é passiva — depende de alguém abrir a
 * tela. Passivo crescente significa que linhas que já venceram o prazo de
 * retenção continuam vivas no banco: é risco de conformidade (LGPD), não
 * apenas de performance.
 *
 * O fan-in de retenção (Onda 135) só enxerga **silêncio** da rotina: se o cron
 * roda todo dia pontualmente e mesmo assim deixa passivo para trás, ele diz
 * "em dia". Este módulo cobre exatamente essa cegueira.
 *
 * ## Leis (I1–I8)
 *
 *  I1. Só execução **válida** (Onda 231) alimenta o veredito. Linha ilegível
 *      ou contestada nunca vira prova de passivo nem de alívio.
 *  I2. Ausência de execução legível **não** emite alerta de passivo — isso é
 *      silêncio de rotina, competência do fan-in de retenção. Emitir aqui
 *      duplicaria o incidente com culpa errada.
 *  I3. Passivo zero na execução mais recente encerra o assunto (`clear`),
 *      mesmo que execuções anteriores tenham tido passivo: o teto alcançou.
 *  I4. Passivo isolado (uma única execução) é `warning` — pode ser pico.
 *  I5. Passivo **persistente** (≥ `PERSIST_RUNS` execuções consecutivas) é
 *      `critical`: o teto de lote está estruturalmente subdimensionado.
 *  I6. Passivo **crescente** entre execuções consecutivas é `critical` mesmo
 *      antes de atingir a persistência — a curva já provou a direção.
 *  I7. Cooldown deriva da cadência, com piso de 60 min e teto de 1440 min:
 *      uma rotina diária não pode gerar avisos de hora em hora, nem ficar
 *      mais de um dia calada depois de acusar.
 *  I8. Chave de rotina prefixada (`admission_backlog:`), para nunca colidir
 *      com detectores homônimos e permitir agrupamento por família.
 *
 * Módulo **puro**: não conhece banco, React nem relógio global. É a fonte da
 * verdade espelhada por `public.evaluate_admission_backlog_alerts()`, com
 * paridade conferida no CI por `scripts/check-admission-backlog.ts`.
 */

import {
  PURGE_CADENCE_MINUTES,
  readPurgeRun,
  type PurgeRunReading,
  type RawPurgeRunRow,
} from './admissionPurgeHistory.ts';

/** Severidades aceitas pelo barramento (`maintenance_alert_events`). */
export type MaintenanceSeverity = 'warning' | 'critical';

/** Prefixo da chave de rotina emitida no barramento (I8). */
export const ADMISSION_BACKLOG_PREFIX = 'admission_backlog:';

/** Nome do trabalho vigiado — a rotina de expurgo do livro de admissão. */
export const ADMISSION_BACKLOG_JOB = 'ledger_purge';

/** Rótulo humano usado nas mensagens (PT-BR). */
export const ADMISSION_BACKLOG_LABEL = 'Expurgo do livro de admissão';

/** Execuções consecutivas com passivo que caracterizam problema estrutural (I5). */
export const PERSIST_RUNS = 3;

/** Piso do cooldown, em minutos (I7). */
export const COOLDOWN_FLOOR_MINUTES = 60;

/** Teto do cooldown, em minutos (I7). */
export const COOLDOWN_CEILING_MINUTES = 1440;

/** Veredito do eixo "passivo" — independente da pontualidade. */
export type BacklogVerdict = 'no_data' | 'clear' | 'spike' | 'persistent' | 'growing';

const VERDICT_LABEL: Record<BacklogVerdict, string> = {
  no_data: 'sem execução legível',
  clear: 'sem passivo',
  spike: 'passivo pontual',
  persistent: 'passivo persistente',
  growing: 'passivo crescente',
};

export function backlogVerdictLabel(verdict: BacklogVerdict): string {
  return VERDICT_LABEL[verdict];
}

/** Retrato do eixo de passivo, antes de virar alerta. */
export interface BacklogAssessment {
  readonly verdict: BacklogVerdict;
  readonly label: string;
  /** Passivo da execução válida mais recente. */
  readonly deferredNow: number;
  /** Quantas execuções válidas consecutivas (da mais recente) têm passivo > 0. */
  readonly consecutiveRuns: number;
  /** Série do passivo, da mais antiga para a mais recente, dentro da janela. */
  readonly trend: readonly number[];
  /** Teto de lote declarado na execução mais recente (`null` se ausente). */
  readonly batchCap: number | null;
  /** Instante da execução válida mais recente. */
  readonly lastRunAt: number | null;
  /** Execuções válidas consideradas. */
  readonly validRuns: number;
}

/** Alerta candidato a ser gravado no barramento de manutenção. */
export interface BacklogAlert {
  readonly routine: string;
  readonly severity: MaintenanceSeverity;
  readonly reason: string;
  readonly verdict: BacklogVerdict;
  readonly cooldownMinutes: number;
  readonly detail: {
    readonly job_name: string;
    readonly verdict: BacklogVerdict;
    readonly deferred_now: number;
    readonly consecutive_runs: number;
    readonly batch_cap: number | null;
    readonly trend: readonly number[];
    readonly cadence_minutes: number;
    readonly cooldown_minutes: number;
  };
  /** Instante observado (execução que originou o alerta). */
  readonly observedAt: number | null;
}

/** I8 — chave prefixada e estável. */
export function admissionBacklogRoutineKey(job: string = ADMISSION_BACKLOG_JOB): string {
  return `${ADMISSION_BACKLOG_PREFIX}${job}`;
}

/**
 * I7 — cooldown derivado da cadência, sempre dentro do piso e do teto.
 * Cadência inválida é erro de programação, não silêncio: falha alto.
 */
export function backlogCooldownMinutes(cadenceMinutes: number): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadência inválida para cooldown: ${cadenceMinutes}`);
  }
  return Math.min(
    COOLDOWN_CEILING_MINUTES,
    Math.max(COOLDOWN_FLOOR_MINUTES, Math.round(cadenceMinutes))
  );
}

/** Severidade derivada do veredito (I4/I5/I6). `null` = não emite. */
export function severityForVerdict(verdict: BacklogVerdict): MaintenanceSeverity | null {
  switch (verdict) {
    case 'growing':
    case 'persistent':
      return 'critical';
    case 'spike':
      return 'warning';
    case 'clear':
    case 'no_data':
      return null;
    default:
      return null;
  }
}

export interface AssessOptions {
  /** Quantas execuções recentes entram na análise de tendência. */
  readonly window?: number;
}

/** Ordena decrescente por `executed_at`, desempate estável por `id`. */
function byRecency(a: PurgeRunReading, b: PurgeRunReading): number {
  const at = a.executedAt ?? Number.NEGATIVE_INFINITY;
  const bt = b.executedAt ?? Number.NEGATIVE_INFINITY;
  if (at !== bt) return bt - at;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * I1–I6 — avalia o eixo de passivo a partir de leituras já normalizadas.
 * Nunca lança: entrada vazia ou toda ilegível vira `no_data`.
 */
export function assessBacklog(
  readings: readonly PurgeRunReading[] | null | undefined,
  options: AssessOptions = {}
): BacklogAssessment {
  const windowSize =
    typeof options.window === 'number' && Number.isInteger(options.window) && options.window > 0
      ? options.window
      : PERSIST_RUNS;

  // I1 — apenas execuções válidas.
  const valid = (Array.isArray(readings) ? readings : [])
    .filter((r): r is PurgeRunReading => !!r && r.status === 'valid' && r.executedAt !== null)
    .slice()
    .sort(byRecency);

  const recent = valid.slice(0, windowSize);
  const trend = recent.map((r) => r.deferred ?? 0).reverse();

  const shell = {
    deferredNow: recent[0]?.deferred ?? 0,
    batchCap: recent[0]?.batchCap ?? null,
    lastRunAt: recent[0]?.executedAt ?? null,
    validRuns: valid.length,
    trend,
  } as const;

  const finish = (verdict: BacklogVerdict, consecutiveRuns: number): BacklogAssessment => ({
    ...shell,
    verdict,
    label: VERDICT_LABEL[verdict],
    consecutiveRuns,
  });

  // I2 — sem execução legível não se acusa passivo.
  if (recent.length === 0) return finish('no_data', 0);

  // I3 — a execução mais recente manda: passivo zerado encerra.
  if (shell.deferredNow === 0) return finish('clear', 0);

  let consecutive = 0;
  for (const run of recent) {
    if ((run.deferred ?? 0) > 0) consecutive += 1;
    else break;
  }

  // I6 — crescimento estrito entre as execuções consecutivas com passivo.
  // Lido do mais antigo para o mais recente dentro do bloco contíguo.
  const block = recent
    .slice(0, consecutive)
    .map((r) => r.deferred ?? 0)
    .reverse();
  let growing = false;
  for (let i = 1; i < block.length; i += 1) {
    const prev = block[i - 1] ?? 0;
    const curr = block[i] ?? 0;
    if (curr > prev) growing = true;
    else if (curr < prev) growing = false;
  }

  if (growing) return finish('growing', consecutive);
  // I5 — persistência exige o bloco cheio de execuções consecutivas.
  if (consecutive >= PERSIST_RUNS) return finish('persistent', consecutive);
  // I4 — passivo sem histórico suficiente é pico.
  return finish('spike', consecutive);
}

/** Conveniência: lê linhas cruas do banco e avalia numa tacada só. */
export function assessBacklogFromRows(
  raws: readonly RawPurgeRunRow[] | null | undefined,
  options: AssessOptions = {}
): BacklogAssessment {
  const list = Array.isArray(raws) ? raws : [];
  return assessBacklog(
    list.map((raw, i) => readPurgeRun(raw ?? {}, i)),
    options
  );
}

export interface BuildAlertOptions extends AssessOptions {
  readonly cadenceMinutes?: number;
  readonly job?: string;
  readonly label?: string;
}

/** Redige a mensagem em PT-BR, sempre com o número que sustenta a acusação. */
function renderReason(label: string, assessment: BacklogAssessment, cadence: number): string {
  const cap = assessment.batchCap === null ? 'teto não declarado' : `teto ${assessment.batchCap}`;
  switch (assessment.verdict) {
    case 'growing':
      return `${label}: passivo crescente (${assessment.trend.join(' → ')}) em ${assessment.consecutiveRuns} execuções — ${cap}, cadência ${cadence} min`;
    case 'persistent':
      return `${label}: passivo de ${assessment.deferredNow} linhas persiste há ${assessment.consecutiveRuns} execuções — ${cap}, cadência ${cadence} min`;
    case 'spike':
      return `${label}: ${assessment.deferredNow} linhas vencidas ficaram para trás na última execução — ${cap}, cadência ${cadence} min`;
    default:
      return `${label}: sem passivo`;
  }
}

/**
 * Constrói o alerta candidato. `null` quando não há o que emitir (I2/I3).
 * A supressão por cooldown é responsabilidade de quem grava — aqui só se
 * declara o cooldown recomendado, para que TS e SQL usem o mesmo número.
 */
export function buildBacklogAlert(
  assessment: BacklogAssessment,
  options: BuildAlertOptions = {}
): BacklogAlert | null {
  const severity = severityForVerdict(assessment.verdict);
  if (severity === null) return null;

  const cadence =
    typeof options.cadenceMinutes === 'number' &&
    Number.isFinite(options.cadenceMinutes) &&
    options.cadenceMinutes > 0
      ? Math.round(options.cadenceMinutes)
      : PURGE_CADENCE_MINUTES;

  const job = options.job ?? ADMISSION_BACKLOG_JOB;
  const label = options.label ?? ADMISSION_BACKLOG_LABEL;
  const cooldown = backlogCooldownMinutes(cadence);

  return {
    routine: admissionBacklogRoutineKey(job),
    severity,
    verdict: assessment.verdict,
    reason: renderReason(label, assessment, cadence),
    cooldownMinutes: cooldown,
    observedAt: assessment.lastRunAt,
    detail: {
      job_name: job,
      verdict: assessment.verdict,
      deferred_now: assessment.deferredNow,
      consecutive_runs: assessment.consecutiveRuns,
      batch_cap: assessment.batchCap,
      trend: assessment.trend,
      cadence_minutes: cadence,
      cooldown_minutes: cooldown,
    },
  };
}

/** Atalho ponta-a-ponta: linhas cruas → alerta (ou `null`). */
export function evaluateAdmissionBacklog(
  raws: readonly RawPurgeRunRow[] | null | undefined,
  options: BuildAlertOptions = {}
): BacklogAlert | null {
  return buildBacklogAlert(assessBacklogFromRows(raws, options), options);
}
