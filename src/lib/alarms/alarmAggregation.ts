/**
 * Onda 178 — agregação de alarme multi-origem, agenda e regra inconsistente.
 *
 * Paridade com "Configuração de alarme" do SIM Next, que define três coisas
 * que nós ainda tratávamos por acidente:
 *
 *   • «O alarme é disparado quando **qualquer** uma das origens reporta o
 *     evento como ativo e tem seu término quando **todas** as fontes reportam
 *     o evento como negativo.»
 *   • «No caso de um dispositivo de origem já estar no estado de alarme quando
 *     o SIM Next for aberto, os alarmes que contenham essa origem serão
 *     disparados novamente no primeiro login.»
 *   • Regra cujas origens/ações apontam para dispositivo removido é marcada
 *     como **inconsistente** (linha amarela), não silenciosamente apagada.
 *
 * O ponto perigoso — e a razão deste módulo existir — é a assimetria: iniciar
 * é OR, encerrar é AND. Implementar "ativo = alguma origem ativa" parece
 * equivalente e não é: **silêncio não é negativa**. Uma origem que nunca
 * reportou, ou que caiu, não pode encerrar um alarme por ausência de notícia.
 * Encerrar por falta de dado é exatamente como um alarme real desaparece.
 *
 * Regras invioláveis:
 *
 *  1. **Início por qualquer, término só por todas.** O episódio abre no
 *     primeiro `active` e só fecha quando **todas** as origens conhecidas da
 *     regra tiverem reportado `clear` — origem desconhecida/silenciosa
 *     mantém o episódio aberto.
 *  2. **Silêncio nunca encerra.** Origem sem reporte é `unknown`, jamais
 *     tratada como `clear`.
 *  3. **A agenda decide admissão, nunca encerramento.** Evento fora da janela
 *     não abre episódio; mas episódio já aberto não é cancelado quando a
 *     janela fecha — a agenda apagaria um alarme real em andamento.
 *  4. **Reabertura no primeiro contato.** Origem que já chega em estado de
 *     alarme na abertura da sessão gera episódio novo (`rearmed`), para o
 *     operador nunca herdar alarme sem ser avisado.
 *  5. **Regra desabilitada congela.** Não dispara e não encerra; não inventa
 *     negativa para origens que ela deixou de escutar.
 *  6. **Inconsistência degrada, não desliga.** Perder parte das origens marca
 *     a regra como inconsistente e continua protegendo o que sobrou; só
 *     perder **todas** as origens torna a regra inoperante.
 *  7. **Evento atrasado é descartado.** Reporte com carimbo anterior ao último
 *     conhecido daquela origem não ressuscita nem encerra episódio.
 *  8. **Puro e determinístico.** Sem relógio próprio, sem rede; a entrada
 *     nunca é mutada.
 */

export type SourceState = 'active' | 'clear' | 'unknown';

/** Estado observado de uma origem da regra. */
export interface SourceReport {
  sourceId: string;
  state: 'active' | 'clear';
  /** Carimbo do **equipamento**, não do servidor (regra 7). */
  at: number;
}

export interface SchedulePeriod {
  /** Minuto do dia [0,1440). Se `startMin > endMin`, a janela cruza a meia-noite. */
  startMin: number;
  endMin: number;
}

/** Agenda semanal: índice 0 = domingo, conforme `Date#getDay`. */
export type AlarmSchedule = readonly (readonly SchedulePeriod[])[];

export const MAX_PERIODS_PER_DAY = 6;
export const MINUTES_PER_DAY = 1440;

export interface AlarmRule {
  id: string;
  enabled: boolean;
  /** Origens configuradas na regra. */
  sourceIds: readonly string[];
  /** Origens que não existem mais (dispositivo removido) — regra 6. */
  missingSourceIds?: readonly string[];
  /** Ações que apontam para dispositivo removido — regra 6. */
  missingActionIds?: readonly string[];
  /** Ausente ou vazia = sempre ativa (24×7). */
  schedule?: AlarmSchedule | null;
}

export interface EpisodeState {
  /** `null` quando não há episódio aberto. */
  openedAt: number | null;
  /** Motivo da abertura do episódio corrente. */
  openedBy: 'report' | 'rearm' | null;
  /** Última leitura conhecida por origem. */
  sources: Readonly<Record<string, { state: SourceState; at: number }>>;
  /** Carimbo do último evento aceito (regra 7). */
  lastAcceptedAt: number | null;
}

export type AlarmTransition =
  | 'none'
  | 'opened'
  | 'rearmed'
  | 'closed'
  /** Evento aceito que não muda o episódio (ex.: segunda origem ativa). */
  | 'sustained';

export type IgnoreReason =
  | 'rule_disabled'
  | 'rule_inoperative'
  | 'unknown_source'
  | 'out_of_schedule'
  | 'stale_report'
  | 'invalid_report';

export interface AggregationResult {
  transition: AlarmTransition;
  /** `null` quando o evento foi ignorado. */
  ignored: IgnoreReason | null;
  state: EpisodeState;
  /** Origens ainda em alarme depois deste evento. */
  activeSources: string[];
  /** Origens sem reporte — as que impedem o encerramento (regra 2). */
  pendingSources: string[];
}

const clone = (state: EpisodeState): EpisodeState => ({
  openedAt: state.openedAt,
  openedBy: state.openedBy,
  sources: { ...state.sources },
  lastAcceptedAt: state.lastAcceptedAt,
});

export const emptyEpisode = (): EpisodeState => ({
  openedAt: null,
  openedBy: null,
  sources: {},
  lastAcceptedAt: null,
});

const isClock = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

/** Período válido: limites inteiros dentro do dia e não degenerado. */
export function isValidPeriod(p: SchedulePeriod | null | undefined): boolean {
  if (!p || typeof p !== 'object') return false;
  const { startMin, endMin } = p;
  if (!Number.isInteger(startMin) || !Number.isInteger(endMin)) return false;
  if (startMin < 0 || startMin >= MINUTES_PER_DAY) return false;
  if (endMin <= 0 || endMin > MINUTES_PER_DAY) return false;
  return startMin !== endMin;
}

/**
 * Normaliza a agenda: descarta períodos inválidos, ordena e aplica o teto de
 * 6 períodos por dia. Descartar em silêncio seria pior que recusar, então a
 * UI deve validar antes; aqui garantimos apenas que a avaliação nunca opera
 * sobre lixo.
 */
export function normalizeSchedule(schedule: AlarmSchedule | null | undefined): SchedulePeriod[][] {
  const out: SchedulePeriod[][] = [[], [], [], [], [], [], []];
  if (!Array.isArray(schedule)) return out;
  for (let day = 0; day < 7; day += 1) {
    const periods = schedule[day];
    if (!Array.isArray(periods)) continue;
    const valid = periods
      .filter(isValidPeriod)
      .map((p) => ({ startMin: p.startMin, endMin: p.endMin }))
      .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
      .slice(0, MAX_PERIODS_PER_DAY);
    out[day] = valid;
  }
  return out;
}

/** Agenda vazia (nenhum período em nenhum dia) significa 24×7. */
export const isAlwaysOn = (schedule: AlarmSchedule | null | undefined): boolean =>
  normalizeSchedule(schedule).every((day) => day.length === 0);

/**
 * O instante está dentro de alguma janela?
 *
 * `tzOffsetMinutes` é o deslocamento local (ex.: -180 para Brasília). Ele é
 * exigido explicitamente porque usar o fuso do processo tornaria a decisão
 * dependente do servidor — a mesma agenda passaria a ligar em horas
 * diferentes conforme onde o código roda.
 */
export function isWithinSchedule(
  schedule: AlarmSchedule | null | undefined,
  at: number,
  tzOffsetMinutes = 0
): boolean {
  if (!isClock(at)) return false;
  const days = normalizeSchedule(schedule);
  if (days.every((d) => d.length === 0)) return true;

  const local = new Date(at + tzOffsetMinutes * 60_000);
  const weekday = local.getUTCDay();
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();

  for (const p of days[weekday] ?? []) {
    if (p.startMin < p.endMin) {
      if (minute >= p.startMin && minute < p.endMin) return true;
    } else if (minute >= p.startMin) {
      // Janela que cruza a meia-noite: hoje do início até 24h.
      return true;
    }
  }
  // ...e a continuação, no dia anterior, das janelas que cruzam a meia-noite.
  const previous = (weekday + 6) % 7;
  for (const p of days[previous] ?? []) {
    if (p.startMin > p.endMin && minute < p.endMin) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Consistência da regra
// ---------------------------------------------------------------------------

export type RuleHealth = 'ok' | 'inconsistent' | 'inoperative' | 'disabled';

export interface RuleDiagnosis {
  health: RuleHealth;
  /** Origens que ainda existem — as únicas que podem disparar. */
  effectiveSourceIds: string[];
  missingSourceIds: string[];
  missingActionIds: string[];
  /** Texto pronto para a linha de aviso da tabela de regras. */
  message: string | null;
}

export function diagnoseRule(rule: AlarmRule): RuleDiagnosis {
  const configured = Array.isArray(rule?.sourceIds) ? rule.sourceIds.filter(Boolean) : [];
  const missingSources = Array.isArray(rule?.missingSourceIds)
    ? rule.missingSourceIds.filter(Boolean)
    : [];
  const missingActions = Array.isArray(rule?.missingActionIds)
    ? rule.missingActionIds.filter(Boolean)
    : [];
  const missingSet = new Set(missingSources);
  const effective = configured.filter((id) => !missingSet.has(id));

  if (!rule?.enabled) {
    return {
      health: 'disabled',
      effectiveSourceIds: effective,
      missingSourceIds: missingSources,
      missingActionIds: missingActions,
      message: 'Regra desabilitada: não dispara nem encerra alarmes.',
    };
  }

  // Regra 6: sem nenhuma origem viva não há o que proteger.
  if (effective.length === 0) {
    return {
      health: 'inoperative',
      effectiveSourceIds: [],
      missingSourceIds: missingSources,
      missingActionIds: missingActions,
      message:
        configured.length === 0
          ? 'Regra sem origem configurada: nunca dispara.'
          : 'Todas as origens desta regra foram removidas: a regra não protege mais nada.',
    };
  }

  if (missingSources.length > 0 || missingActions.length > 0) {
    const parts: string[] = [];
    if (missingSources.length > 0) {
      parts.push(`${missingSources.length} origem(ns) removida(s)`);
    }
    if (missingActions.length > 0) {
      parts.push(`${missingActions.length} ação(ões) apontando para dispositivo removido`);
    }
    return {
      health: 'inconsistent',
      effectiveSourceIds: effective,
      missingSourceIds: missingSources,
      missingActionIds: missingActions,
      message: `Regra operando parcialmente: ${parts.join(' e ')}. Edite a regra para corrigir.`,
    };
  }

  return {
    health: 'ok',
    effectiveSourceIds: effective,
    missingSourceIds: [],
    missingActionIds: [],
    message: null,
  };
}

// ---------------------------------------------------------------------------
// Agregação
// ---------------------------------------------------------------------------

function summarize(state: EpisodeState, effective: readonly string[]) {
  const activeSources: string[] = [];
  const pendingSources: string[] = [];
  for (const id of effective) {
    const entry = state.sources[id];
    if (!entry || entry.state === 'unknown') pendingSources.push(id);
    else if (entry.state === 'active') activeSources.push(id);
  }
  return { activeSources, pendingSources };
}

const ignore = (
  reason: IgnoreReason,
  state: EpisodeState,
  effective: readonly string[]
): AggregationResult => ({
  transition: 'none',
  ignored: reason,
  state,
  ...summarize(state, effective),
});

/**
 * Aplica um reporte de origem sobre o episódio corrente.
 *
 * Nunca lança e nunca muta `state`: devolve sempre um estado novo, para que o
 * chamador possa comparar antes/depois sem risco de ter perdido o anterior.
 */
export function applySourceReport(
  rule: AlarmRule,
  state: EpisodeState,
  report: SourceReport,
  options: { tzOffsetMinutes?: number } = {}
): AggregationResult {
  const base: EpisodeState = state && typeof state === 'object' ? clone(state) : emptyEpisode();
  const diagnosis = diagnoseRule(rule);
  const effective = diagnosis.effectiveSourceIds;

  if (diagnosis.health === 'disabled') return ignore('rule_disabled', base, effective);
  if (diagnosis.health === 'inoperative') return ignore('rule_inoperative', base, effective);

  if (
    !report ||
    typeof report.sourceId !== 'string' ||
    (report.state !== 'active' && report.state !== 'clear') ||
    !isClock(report.at)
  ) {
    return ignore('invalid_report', base, effective);
  }

  if (!effective.includes(report.sourceId)) return ignore('unknown_source', base, effective);

  // Regra 7: atrasado em relação à própria origem não vale.
  const previous = base.sources[report.sourceId];
  if (previous && report.at < previous.at) return ignore('stale_report', base, effective);

  const wasOpen = base.openedAt !== null;

  // Regra 3: a agenda barra a **abertura**, nunca o encerramento.
  if (!wasOpen && report.state === 'active') {
    if (!isWithinSchedule(rule.schedule, report.at, options.tzOffsetMinutes ?? 0)) {
      return ignore('out_of_schedule', base, effective);
    }
  }

  const next: EpisodeState = {
    ...base,
    sources: { ...base.sources, [report.sourceId]: { state: report.state, at: report.at } },
    lastAcceptedAt:
      base.lastAcceptedAt === null ? report.at : Math.max(base.lastAcceptedAt, report.at),
  };

  const { activeSources, pendingSources } = summarize(next, effective);

  let transition: AlarmTransition = 'sustained';
  if (!wasOpen && report.state === 'active') {
    next.openedAt = report.at;
    next.openedBy = 'report';
    transition = 'opened';
  } else if (wasOpen) {
    // Regras 1 e 2: fecha só com TODAS as origens em `clear`.
    const allClear = activeSources.length === 0 && pendingSources.length === 0;
    if (allClear) {
      next.openedAt = null;
      next.openedBy = null;
      transition = 'closed';
    }
  } else {
    // `clear` sem episódio aberto apenas registra a leitura.
    transition = 'sustained';
  }

  return { transition, ignored: null, state: next, activeSources, pendingSources };
}

/**
 * Regra 4 — primeiro contato da sessão.
 *
 * Origem que já chega em alarme rearma o episódio: o operador precisa ser
 * avisado de novo, porque ele não estava presente quando o alarme começou.
 * A agenda **não** barra o rearme: o alarme é um fato preexistente, não um
 * disparo novo que a janela poderia recusar.
 */
export function rearmOnConnect(
  rule: AlarmRule,
  state: EpisodeState,
  reports: readonly SourceReport[],
  at: number
): AggregationResult {
  const base: EpisodeState = state && typeof state === 'object' ? clone(state) : emptyEpisode();
  const diagnosis = diagnoseRule(rule);
  const effective = diagnosis.effectiveSourceIds;

  if (diagnosis.health === 'disabled') return ignore('rule_disabled', base, effective);
  if (diagnosis.health === 'inoperative') return ignore('rule_inoperative', base, effective);

  const stamp = isClock(at) ? at : 0;
  const sources: Record<string, { state: SourceState; at: number }> = { ...base.sources };
  const next: EpisodeState = { ...base, sources };
  let anyActive = false;

  for (const report of Array.isArray(reports) ? reports : []) {
    if (
      !report ||
      typeof report.sourceId !== 'string' ||
      (report.state !== 'active' && report.state !== 'clear') ||
      !effective.includes(report.sourceId)
    ) {
      continue;
    }
    const stampedAt = isClock(report.at) ? report.at : stamp;
    const previous = sources[report.sourceId];
    if (previous && stampedAt < previous.at) continue;
    sources[report.sourceId] = { state: report.state, at: stampedAt };
    if (report.state === 'active') anyActive = true;
    next.lastAcceptedAt =
      next.lastAcceptedAt === null ? stampedAt : Math.max(next.lastAcceptedAt, stampedAt);
  }

  const { activeSources, pendingSources } = summarize(next, effective);

  if (anyActive) {
    next.openedAt = stamp;
    next.openedBy = 'rearm';
    return { transition: 'rearmed', ignored: null, state: next, activeSources, pendingSources };
  }

  if (base.openedAt !== null && activeSources.length === 0 && pendingSources.length === 0) {
    next.openedAt = null;
    next.openedBy = null;
    return { transition: 'closed', ignored: null, state: next, activeSources, pendingSources };
  }

  return { transition: 'none', ignored: null, state: next, activeSources, pendingSources };
}

const HEALTH_LABEL: Record<RuleHealth, string> = {
  ok: 'Consistente',
  inconsistent: 'Inconsistente',
  inoperative: 'Inoperante',
  disabled: 'Desabilitada',
};

const IGNORE_LABEL: Record<IgnoreReason, string> = {
  rule_disabled: 'regra desabilitada',
  rule_inoperative: 'regra sem origem válida',
  unknown_source: 'origem fora da regra',
  out_of_schedule: 'fora do horário agendado',
  stale_report: 'reporte atrasado',
  invalid_report: 'reporte inválido',
};

export const ruleHealthLabel = (health: RuleHealth): string => HEALTH_LABEL[health] ?? health;
export const ignoreReasonLabel = (reason: IgnoreReason): string => IGNORE_LABEL[reason] ?? reason;

/** Descrição curta do porquê o episódio ainda não fechou (regra 2). */
export function pendingExplanation(result: AggregationResult): string | null {
  if (result.state.openedAt === null) return null;
  if (result.activeSources.length > 0) {
    return `${result.activeSources.length} origem(ns) ainda em alarme.`;
  }
  if (result.pendingSources.length > 0) {
    return `Aguardando confirmação de normalidade de ${result.pendingSources.length} origem(ns); silêncio não encerra o alarme.`;
  }
  return null;
}
