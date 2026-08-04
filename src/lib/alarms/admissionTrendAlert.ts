/**
 * Onda 236 — Fan-in da **tendência** do órfão para o barramento de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 234 leva ao barramento a *foto* da conciliação: hoje há órfão, logo
 * alerta crítico. Mas a foto não distingue dois fatos operacionalmente opostos:
 * um órfão que apareceu ontem e some no próximo ciclo, e um órfão que cresce
 * há duas semanas. Ambos chegam ao operador com o mesmo peso, na mesma chave,
 * com o mesmo cooldown — e é justamente o segundo (vazamento estrutural de
 * contabilidade) que fica sepultado sob a repetição do primeiro.
 *
 * A Onda 235 passou a **guardar** a série histórica e a classificá-la, mas
 * outra vez o veredito só existia para quem abrisse `/manutencao`. Esta régua
 * fecha o laço: a tendência vira alerta próprio, com **chave distinta**
 * (`admission_trend:`), para que reconhecimento, escalada e retenção do
 * barramento tratem "órfão crescente" como uma fonte separada de "há órfão".
 *
 * ## Leis (M1–M8)
 *
 *  M1. A severidade é **derivada** do veredito de tendência. Nenhum chamador
 *      informa, eleva ou rebaixa severidade — caso contrário a tendência
 *      deixaria de ser medida e viraria opinião.
 *  M2. `growing` é `critical` e usa **metade** da cadência como cooldown:
 *      crescimento estrito precisa reaparecer antes do operador esquecer.
 *  M3. `persistent` também é `critical`, mas com cooldown de **uma cadência
 *      inteira**. Persistência já é conhecida; repeti-la no ritmo do
 *      crescimento transformaria o canal crítico em ruído de fundo.
 *  M4. `resolving` e `emerging` são `warning`. Órfão em queda **continua
 *      sendo órfão** (nunca silencia), e órfão recém-surgido ainda não tem
 *      amostra para acusar padrão.
 *  M5. `clear` e `no_history` não emitem — e "não emitiu" JAMAIS é
 *      apresentado como "contabilidade conferida e íntegra".
 *  M6. Histórico composto **apenas** de fotos ilegíveis nunca vira tendência:
 *      sem foto legível o veredito é `no_history` e a cegueira é acusada pelo
 *      fan-in de conciliação (K4), não aqui. Acusar duas vezes é ruído.
 *  M7. A chave é estável e prefixada `admission_trend:`, jamais colidindo com
 *      `admission_reconcile:` (Onda 234) nem com `admission_backlog:`
 *      (Onda 232). Fontes distintas, escadas de escalada distintas.
 *  M8. Nenhum alerta é redigido sem a **série** que o sustenta, mais as fotos
 *      legíveis e as descartadas. Tendência sem série não é auditável.
 *
 * Módulo **puro**: sem banco, sem React, sem relógio global. É a fonte da
 * verdade espelhada por `public.admission_trend_severity()` /
 * `public.admission_trend_cooldown()` / `public.evaluate_admission_trend_alerts()`
 * e conferida no CI por `scripts/check-admission-trend-alert.ts`.
 */

import {
  DEFAULT_WINDOW,
  renderTrendReason,
  type OrphanTrendAssessment,
  type OrphanTrendVerdict,
} from './admissionOrphanTrend.ts';

/** Severidade aceita pelo barramento de manutenção. */
export type TrendAlertSeverity = 'warning' | 'critical';

/** M7 — prefixo próprio, nunca colide com os fan-ins vizinhos. */
export const ADMISSION_TREND_PREFIX = 'admission_trend:';

/** Job supervisionado. */
export const ADMISSION_TREND_JOB = 'ledger_stock';

/** Cadência da conciliação diária (espelhada no cron SQL). */
export const TREND_CADENCE_MINUTES = 24 * 60;

/** Piso e teto do cooldown, em minutos. */
export const COOLDOWN_FLOOR_MINUTES = 60;
export const COOLDOWN_CEILING_MINUTES = 1440;

/** M7 — chave prefixada e estável. */
export function admissionTrendRoutineKey(job: string = ADMISSION_TREND_JOB): string {
  return `${ADMISSION_TREND_PREFIX}${job}`;
}

/**
 * M1–M5 — severidade derivada do veredito de tendência. `null` = não emite.
 *
 * Deliberadamente NÃO reusa `severityForTrend` da Onda 235: aquela governa a
 * pintura da tela; esta governa o barramento. Se um dia divergirem, a
 * divergência precisa ser uma decisão explícita, não um efeito colateral.
 */
export function trendAlertSeverity(verdict: OrphanTrendVerdict): TrendAlertSeverity | null {
  switch (verdict) {
    case 'growing':
      return 'critical'; // M2
    case 'persistent':
      return 'critical'; // M3
    case 'resolving':
    case 'emerging':
      return 'warning'; // M4
    case 'clear':
    case 'no_history':
      return null; // M5
    default:
      return null;
  }
}

/**
 * M2/M3 — cooldown derivado da cadência **e do veredito**, sempre dentro do
 * piso e do teto. Cadência inválida é erro de programação: falha alto, em vez
 * de silenciar um canal crítico com um número inventado.
 */
export function trendCooldownMinutes(cadenceMinutes: number, verdict: OrphanTrendVerdict): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadência inválida para cooldown: ${cadenceMinutes}`);
  }
  const base = verdict === 'growing' ? Math.round(cadenceMinutes / 2) : Math.round(cadenceMinutes);
  return Math.min(COOLDOWN_CEILING_MINUTES, Math.max(COOLDOWN_FLOOR_MINUTES, base));
}

/** Alerta candidato a ser gravado no barramento. */
export interface TrendAlert {
  readonly routine: string;
  readonly severity: TrendAlertSeverity;
  readonly verdict: OrphanTrendVerdict;
  readonly reason: string;
  readonly cooldownMinutes: number;
  readonly detail: {
    readonly job_name: string;
    readonly verdict: OrphanTrendVerdict;
    readonly orphan_now: number;
    readonly consecutive: number;
    readonly series: readonly number[];
    readonly readable: number;
    readonly unreadable: number;
    readonly window: number;
    readonly cadence_minutes: number;
    readonly cooldown_minutes: number;
  };
  /** Instante da foto legível mais recente que sustenta a acusação. */
  readonly observedAt: number | null;
}

export interface BuildTrendAlertOptions {
  readonly cadenceMinutes?: number;
  readonly job?: string;
  readonly window?: number;
}

/**
 * Converte o retrato de tendência (Onda 235) em alerta de manutenção.
 * Retorna `null` quando o veredito não emite (M5/M6). Só lança quando a
 * cadência informada é inválida (contrato de `trendCooldownMinutes`).
 */
export function buildTrendAlert(
  assessment: OrphanTrendAssessment | null | undefined,
  options: BuildTrendAlertOptions = {}
): TrendAlert | null {
  if (!assessment) return null;

  // M6 — sem nenhuma foto legível não há tendência a acusar.
  if (assessment.readable <= 0) return null;

  const severity = trendAlertSeverity(assessment.verdict);
  if (severity === null) return null;

  const cadence =
    typeof options.cadenceMinutes === 'number' && Number.isFinite(options.cadenceMinutes)
      ? options.cadenceMinutes
      : TREND_CADENCE_MINUTES;
  const cooldown = trendCooldownMinutes(cadence, assessment.verdict);
  const job = options.job ?? ADMISSION_TREND_JOB;
  const windowSize =
    typeof options.window === 'number' && Number.isInteger(options.window) && options.window > 0
      ? options.window
      : DEFAULT_WINDOW;

  // M8 — a frase sempre carrega a série; o sufixo carrega o custo de leitura.
  const reason =
    `${renderTrendReason(assessment)} — ` +
    `${assessment.readable} foto(s) legível(is), ${assessment.unreadable} descartada(s), ` +
    `cadência ${cadence} min`;

  return {
    routine: admissionTrendRoutineKey(job),
    severity,
    verdict: assessment.verdict,
    reason,
    cooldownMinutes: cooldown,
    detail: {
      job_name: job,
      verdict: assessment.verdict,
      orphan_now: assessment.orphanNow,
      consecutive: assessment.consecutive,
      series: assessment.trend,
      readable: assessment.readable,
      unreadable: assessment.unreadable,
      window: windowSize,
      cadence_minutes: cadence,
      cooldown_minutes: cooldown,
    },
    observedAt: assessment.lastObservedAt,
  };
}
