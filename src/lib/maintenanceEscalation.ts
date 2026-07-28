/**
 * Onda 117 — Escalonamento por tempo de vida de alertas de manutenção.
 *
 * Contexto do problema:
 * as Ondas 110/111 detectam falhas de rotina e as despacham para Telegram/e-mail.
 * O ponto cego que sobrou é o *silêncio depois do aviso*: um alerta crítico é
 * emitido às 03:00, o despacho é marcado `sent`, e ninguém abre o Telegram até
 * as 09:00. Do ponto de vista do sistema está tudo certo — houve detecção e
 * houve notificação — mas o incidente ficou seis horas sem dono. Notificar não
 * é o objetivo; **fechar o incidente** é. Este módulo mede o tempo de vida do
 * alerta *não reconhecido* e sobe a escada de urgência.
 *
 * Este é a ÚNICA fonte de verdade da política de escalonamento. O SQL apenas
 * coleta fatos (idade, nível atual, resultado do despacho) e aplica a decisão;
 * o gate de CI e a UI importam daqui. Reimplementar os limiares em PL/pgSQL
 * reproduziria o problema clássico das ondas anteriores: o painel mostrando um
 * nível e o cron aplicando outro.
 *
 * Escada (nível é uma propriedade do alerta, não do canal):
 *
 *   0  notified   → alerta emitido e despachado; aguardando reconhecimento
 *   1  reminder   → repique nos mesmos canais; ninguém confirmou leitura
 *   2  escalated  → vira um novo evento crítico no barramento (chama o time)
 *   3  paged      → plantão; teto reservado a `critical`
 *
 * Decisões deliberadamente conservadoras:
 *
 *  - **Um degrau por avaliação.** Um alerta descoberto já velho (backfill,
 *    cron parado, restore de backup) não pula direto para o plantão às 04:00.
 *    Ele sobe 1 nível por execução, respeitando `minStepMinutes` entre passos.
 *  - **Despacho fracassado acelera, nunca desacelera.** Se nenhum canal
 *    entregou, o operador comprovadamente não foi avisado: o primeiro degrau
 *    dispensa a espera normal (só a carência curta). O caminho inverso — adiar
 *    porque o envio falhou — deixaria o incidente órfão.
 *  - **Reconhecer congela.** `acknowledged_at` interrompe a escada em qualquer
 *    ponto. Reconhecer é afirmar que existe um humano com o caso na mão.
 *  - **`warning` não chega ao plantão.** Acordar alguém às 3h por um aviso
 *    destrói a credibilidade do canal e leva o time a silenciar tudo.
 *
 * Invariantes varridas por `scripts/simulate-wave117-scenarios.mjs`:
 *   I1  alerta reconhecido nunca escala (qualquer idade, qualquer nível)
 *   I2  o nível nunca decresce
 *   I3  no máximo +1 nível por avaliação
 *   I4  nenhum passo dentro de `minStepMinutes` do passo anterior
 *   I5  teto por severidade: warning ≤ 2, critical ≤ 3
 *   I6  monotonicidade: envelhecer o alerta nunca reduz o nível alvo
 *   I7  despacho não entregue nunca produz nível alvo menor que o entregue
 *   I8  relógio recuado (idade negativa) não escala
 *   I9  idempotência: reaplicar sobre o estado já atualizado não age
 *   I10 independência da ordem dos alertas na entrada
 *   I11 todo passo para nível ≥ 2 emite alerta no barramento de manutenção
 */

import {
  escalationProfileFor,
  type ConditionStreak,
  type EscalationProfile,
} from './escalationProfiles.ts';

/** Severidade compatível com `maintenance_alert_events`. */
export type MaintenanceSeverity = 'warning' | 'critical';

/** Veredito agregado; inclui `ok`, que a tabela de eventos não aceita. */
export type EscalationVerdictSeverity = 'ok' | MaintenanceSeverity;

/** Níveis da escada, em ordem crescente de urgência. */
export type EscalationLevel = 0 | 1 | 2 | 3;

export const ESCALATION_LEVEL_LABELS: Readonly<Record<EscalationLevel, string>> = {
  0: 'notificado',
  1: 'lembrete',
  2: 'escalonado',
  3: 'plantão',
};

export interface EscalationThresholds {
  /**
   * Idade mínima (min) para cada degrau, indexada pelo nível de DESTINO.
   * Índice 0 não é usado — não existe "subir para 0".
   */
  readonly ageMinutesByLevel: Readonly<Record<MaintenanceSeverity, readonly number[]>>;
  /** Teto da escada por severidade. */
  readonly maxLevel: Readonly<Record<MaintenanceSeverity, EscalationLevel>>;
  /** Intervalo mínimo entre dois degraus do mesmo alerta. */
  readonly minStepMinutes: number;
  /**
   * Carência aplicada quando NENHUM canal entregou: mesmo sem notificação,
   * espera-se um ciclo do despachante (Onda 111 roda de hora em hora) antes de
   * concluir que o operador está no escuro.
   */
  readonly undeliveredGraceMinutes: number;
}

export const DEFAULT_ESCALATION_THRESHOLDS: EscalationThresholds = {
  ageMinutesByLevel: {
    // [_, →1, →2, →3]
    critical: [0, 30, 120, 360],
    warning: [0, 240, 1440, Number.POSITIVE_INFINITY],
  },
  maxLevel: { critical: 3, warning: 2 },
  minStepMinutes: 30,
  undeliveredGraceMinutes: 75,
};

/** Estado de entrega consolidado do alerta (Onda 111). */
export interface AlertDispatchState {
  /** Ao menos um canal com `status = 'sent'`. */
  readonly delivered: boolean;
  /** Canais que tentaram e falharam. */
  readonly failedChannels: number;
  /** `true` quando não há nenhuma linha de despacho para o alerta. */
  readonly neverAttempted: boolean;
}

export const UNDELIVERED_DISPATCH: AlertDispatchState = {
  delivered: false,
  failedChannels: 0,
  neverAttempted: true,
};

export interface AlertSnapshot {
  readonly id: string;
  readonly routine: string;
  readonly severity: MaintenanceSeverity;
  readonly reason: string;
  readonly createdAtMs: number;
  readonly acknowledgedAtMs: number | null;
  readonly escalationLevel: EscalationLevel;
  /** Instante do último degrau; `null` quando o alerta nunca escalou. */
  readonly lastEscalatedAtMs: number | null;
  readonly dispatch: AlertDispatchState;
  /**
   * Onda 238 (O3/O4) — âncora da condição, quando a fonte é renovável.
   * Ausente para fontes `row`, e ignorada quando o perfil resolvido não usa
   * `streak`: o perfil manda, nunca o chamador.
   */
  readonly streak?: ConditionStreak | null;
}

export interface EscalationInput {
  /** Referência temporal injetada — mantém a simulação determinística. */
  readonly nowMs: number;
  readonly alerts: readonly AlertSnapshot[];
  /**
   * Override explícito da régua. Quando ausente (o caso normal desde a Onda
   * 238), a régua vem do **perfil da fonte**. Mantido para que a suíte da
   * Onda 117 continue exercitando limiares arbitrários.
   */
  readonly thresholds?: EscalationThresholds;
}


export interface EscalationDecision {
  readonly alertId: string;
  readonly routine: string;
  readonly severity: MaintenanceSeverity;
  readonly fromLevel: EscalationLevel;
  readonly toLevel: EscalationLevel;
  /** `true` quando há degrau a aplicar (`toLevel > fromLevel`). */
  readonly shouldEscalate: boolean;
  /** `true` quando o degrau precisa virar evento no barramento (nível ≥ 2). */
  readonly emitsAlert: boolean;
  readonly ageMinutes: number;
  /** Onda 238 (O10) — perfil efetivamente aplicado. */
  readonly profileId: string;
  /** Onda 238 (O3) — `true` quando a idade veio da âncora da condição. */
  readonly anchoredOnStreak: boolean;
  readonly reason: string;
}


export interface EscalationVerdict {
  readonly severity: EscalationVerdictSeverity;
  readonly decisions: readonly EscalationDecision[];
  /** Apenas os alertas com degrau a aplicar, na ordem de entrada. */
  readonly pending: readonly EscalationDecision[];
  /** Resumo pronto para virar `reason` em `maintenance_alert_events`. */
  readonly reason: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

const MINUTE_MS = 60_000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampLevel(value: number): EscalationLevel {
  if (value <= 0) return 0;
  if (value >= 3) return 3;
  return (value === 1 ? 1 : 2) as EscalationLevel;
}

/**
 * Idade do alerta em minutos.
 *
 * Idade negativa significa `created_at` no futuro — relógio do servidor que
 * recuou (NTP step) ou linha importada. Devolvemos 0 em vez de um número
 * negativo: um alerta "do futuro" não deve escalar, e zerar produz exatamente
 * esse efeito sem exigir um ramo especial em cada comparação (I8).
 */
function ageMinutes(nowMs: number, createdAtMs: number): number {
  return Math.max(0, (nowMs - createdAtMs) / MINUTE_MS);
}

/**
 * Nível que a idade sozinha justifica, ignorando cooldown e degrau único.
 * Separado da decisão final para tornar a monotonicidade (I6) testável.
 */
export function targetLevelForAge(
  severity: MaintenanceSeverity,
  ageMin: number,
  dispatch: AlertDispatchState,
  thresholds: EscalationThresholds = DEFAULT_ESCALATION_THRESHOLDS,
): EscalationLevel {
  const ladder = thresholds.ageMinutesByLevel[severity];
  const ceiling = thresholds.maxLevel[severity];

  // Ninguém foi avisado: o primeiro degrau (repique) não espera o prazo normal,
  // só a carência de um ciclo do despachante. Degraus seguintes seguem a régua
  // padrão — acelerar tudo transformaria uma falha de canal em pager storm.
  const undelivered = !dispatch.delivered;

  let level: EscalationLevel = 0;
  for (let candidate = 1; candidate <= ceiling; candidate += 1) {
    const required = ladder[candidate];
    if (required === undefined || !Number.isFinite(required)) break;
    const effective =
      undelivered && candidate === 1 ? Math.min(required, thresholds.undeliveredGraceMinutes) : required;
    if (ageMin >= effective) level = clampLevel(candidate);
    else break;
  }
  return level;
}

function describe(decision: {
  severity: MaintenanceSeverity;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  ageMin: number;
  dispatch: AlertDispatchState;
  blockedByCooldown: boolean;
  acknowledged: boolean;
}): string {
  const age = `${round1(decision.ageMin)} min sem reconhecimento`;
  if (decision.acknowledged) return 'alerta reconhecido — escada congelada';
  if (decision.blockedByCooldown) return `aguardando intervalo mínimo entre degraus (${age})`;
  if (decision.toLevel === decision.fromLevel) {
    return `nível ${decision.fromLevel} (${ESCALATION_LEVEL_LABELS[decision.fromLevel]}) mantido — ${age}`;
  }
  const delivery = decision.dispatch.delivered
    ? 'notificação entregue'
    : decision.dispatch.neverAttempted
      ? 'nenhum despacho registrado'
      : 'todos os canais falharam';
  return `${age}; ${delivery} → ${ESCALATION_LEVEL_LABELS[decision.toLevel]}`;
}

/**
 * Onda 238 — converte um perfil na régua consumida pela Onda 117.
 *
 * `null` no perfil (degrau inalcançável) vira `+Infinity`, que é a forma que
 * `targetLevelForAge` já sabia tratar. Manter uma única representação interna
 * evita um segundo ramo de comparação — e ramo duplicado em régua de escalada
 * é onde os erros se escondem.
 */
export function thresholdsFromProfile(profile: EscalationProfile): EscalationThresholds {
  const toLadder = (values: readonly (number | null)[]): readonly number[] =>
    values.map((v) => (v === null ? Number.POSITIVE_INFINITY : v));
  return {
    ageMinutesByLevel: {
      critical: toLadder(profile.ladderMinutes.critical),
      warning: toLadder(profile.ladderMinutes.warning),
    },
    maxLevel: profile.maxLevel,
    minStepMinutes: profile.minStepMinutes,
    undeliveredGraceMinutes: profile.undeliveredGraceMinutes,
  };
}

/**
 * Avalia a escada para um único alerta. Exportada para o simulador poder
 * exercitar invariantes por alerta sem montar o agregado inteiro.
 *
 * Desde a Onda 238, `thresholds` é **opcional**: omitido, a régua vem do
 * perfil da fonte (O1) e, quando o perfil é renovável, idade e nível de
 * partida vêm da âncora da condição (O3/O4).
 */
export function evaluateAlertEscalation(
  alert: AlertSnapshot,
  nowMs: number,
  thresholds?: EscalationThresholds,
): EscalationDecision {
  const profile = escalationProfileFor(alert.routine);
  const rule = thresholds ?? thresholdsFromProfile(profile);

  // O3/O4 — a âncora só é honrada quando o PERFIL a pede. Um chamador não
  // consegue transformar uma fonte pontual em renovável passando `streak`.
  const streak = profile.anchorMode === 'streak' ? (alert.streak ?? null) : null;
  const anchoredOnStreak = streak !== null;

  const ageMin = ageMinutes(nowMs, anchoredOnStreak ? streak.anchorAtMs : alert.createdAtMs);
  const from = clampLevel(
    anchoredOnStreak ? Math.max(alert.escalationLevel, streak.maxLevel) : alert.escalationLevel,
  );
  const acknowledged = alert.acknowledgedAtMs !== null;

  const base = {
    alertId: alert.id,
    routine: alert.routine,
    severity: alert.severity,
    fromLevel: from,
    ageMinutes: round1(ageMin),
    profileId: profile.id,
    anchoredOnStreak,
  } as const;


  // I1 — reconhecer congela a escada, independentemente de idade ou nível.
  if (acknowledged) {
    return {
      ...base,
      toLevel: from,
      shouldEscalate: false,
      emitsAlert: false,
      reason: describe({
        severity: alert.severity,
        fromLevel: from,
        toLevel: from,
        ageMin,
        dispatch: alert.dispatch,
        blockedByCooldown: false,
        acknowledged: true,
      }),
    };
  }

  const desired = targetLevelForAge(alert.severity, ageMin, alert.dispatch, rule);

  // I2 — nunca desce. Um alerta já escalonado não volta a "lembrete" porque a
  // régua mudou ou porque a idade foi recalculada com outro relógio.
  if (desired <= from) {
    return {
      ...base,
      toLevel: from,
      shouldEscalate: false,
      emitsAlert: false,
      reason: describe({
        severity: alert.severity,
        fromLevel: from,
        toLevel: from,
        ageMin,
        dispatch: alert.dispatch,
        blockedByCooldown: false,
        acknowledged: false,
      }),
    };
  }

  // I4 — cooldown entre degraus. Sem isto, um alerta descoberto velho subiria
  // três níveis em três execuções consecutivas de minuto em minuto.
  const sinceLastStep =
    alert.lastEscalatedAtMs === null ? Number.POSITIVE_INFINITY : (nowMs - alert.lastEscalatedAtMs) / MINUTE_MS;
  if (sinceLastStep < rule.minStepMinutes) {
    return {
      ...base,
      toLevel: from,
      shouldEscalate: false,
      emitsAlert: false,
      reason: describe({
        severity: alert.severity,
        fromLevel: from,
        toLevel: from,
        ageMin,
        dispatch: alert.dispatch,
        blockedByCooldown: true,
        acknowledged: false,
      }),
    };
  }

  // I3 — um degrau por avaliação, respeitando o teto da severidade (I5).
  const ceiling = rule.maxLevel[alert.severity];
  const next = clampLevel(Math.min(from + 1, desired, ceiling));

  // O10 — o perfil aplicado (e a âncora, quando usada) viajam no texto do
  // degrau. Escada silenciosa é escada que ninguém audita.
  const provenance = anchoredOnStreak
    ? ` [perfil: ${profile.label}; âncora da condição sobre ${streak.rows} linha(s)]`
    : ` [perfil: ${profile.label}]`;

  return {
    ...base,
    toLevel: next,
    shouldEscalate: next > from,
    // I11 — a partir do nível 2 o incidente deixa de ser "repique de canal" e
    // passa a ser um fato novo que o barramento precisa registrar.
    emitsAlert: next >= 2,
    reason:
      describe({
        severity: alert.severity,
        fromLevel: from,
        toLevel: next,
        ageMin,
        dispatch: alert.dispatch,
        blockedByCooldown: false,
        acknowledged: false,
      }) + provenance,

  };
}

/**
 * Veredito agregado sobre a fila de alertas abertos.
 *
 * `critical` quando existe alerta em nível de plantão ou prestes a chegar lá;
 * `warning` quando há repiques pendentes. A ausência de alertas abertos é `ok`
 * — este módulo mede reconhecimento, não a saúde das rotinas em si.
 */
export function evaluateEscalations(input: EscalationInput): EscalationVerdict {
  // Onda 238 — sem override, cada alerta resolve o próprio perfil (O1).
  const decisions = input.alerts.map((alert) =>
    evaluateAlertEscalation(alert, input.nowMs, input.thresholds),
  );

  const pending = decisions.filter((d) => d.shouldEscalate);

  const paged = decisions.filter((d) => d.toLevel >= 3).length;
  const escalated = decisions.filter((d) => d.toLevel === 2).length;
  const reminders = decisions.filter((d) => d.toLevel === 1).length;
  const acknowledged = input.alerts.filter((a) => a.acknowledgedAtMs !== null).length;
  const undelivered = input.alerts.filter((a) => a.acknowledgedAtMs === null && !a.dispatch.delivered).length;

  let severity: EscalationVerdictSeverity = 'ok';
  if (paged > 0 || escalated > 0) severity = 'critical';
  else if (reminders > 0 || undelivered > 0) severity = 'warning';

  const reason =
    severity === 'ok'
      ? `${input.alerts.length} alerta(s) aberto(s), nenhum passou do prazo de reconhecimento`
      : `${paged} em plantão, ${escalated} escalonado(s), ${reminders} em lembrete; ` +
        `${pending.length} degrau(s) a aplicar agora`;

  return {
    severity,
    decisions,
    pending,
    reason,
    detail: {
      total: input.alerts.length,
      acknowledged,
      undelivered,
      byLevel: { paged, escalated, reminders },
      pending: pending.map((d) => ({
        alert_id: d.alertId,
        routine: d.routine,
        severity: d.severity,
        from_level: d.fromLevel,
        to_level: d.toLevel,
        age_minutes: d.ageMinutes,
      })),
    },
  };
}
