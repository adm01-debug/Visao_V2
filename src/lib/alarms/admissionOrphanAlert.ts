/**
 * Onda 234 — Fan-in do veredito de conciliação para o barramento de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 233 passou a **enxergar** o estoque vencido sem dono (`unaccounted`),
 * mas o fato só aparecia para quem abrisse `/manutencao` e olhasse o cartão.
 * Órfão é exatamente a classe de falha que ninguém procura: a rotina declara
 * "em dia", os painéis de passivo ficam verdes, e a única evidência mora numa
 * tela que só é aberta quando já houve suspeita. Um defeito silencioso que
 * depende de alguém desconfiar não é supervisionado — é sorte.
 *
 * Esta régua transforma o veredito da conciliação em **alerta de manutenção**,
 * com a mesma disciplina das Ondas 114/135/232: severidade derivada do
 * veredito (nunca informada de fora), cooldown derivado da cadência, chave
 * estável e mensagem que sempre carrega o número que sustenta a acusação.
 *
 * ## Leis (K1–K8)
 *
 *  K1. A severidade é **derivada** do veredito da conciliação. Nenhum chamador
 *      pode elevar, rebaixar ou informar severidade: se pudesse, a acusação
 *      deixaria de ser prova e viraria opinião.
 *  K2. `unaccounted` é sempre `critical` e sempre emite. Estoque vencido sem
 *      dono é a única evidência direta de contabilidade mentirosa; nunca é
 *      resumido, agrupado ou rebaixado por ruído.
 *  K3. `no_run` (estoque vencido vivo, sem execução legível) é `warning`, não
 *      `critical`: a culpa é de silêncio de rotina, já coberta pelo fan-in de
 *      retenção (Onda 135). Acusar duas vezes com peso máximo é ruído.
 *  K4. `indeterminate` por **corrida benigna** — a foto do inventário é
 *      anterior à última execução (`inventario_anterior_a_execucao`, J2) —
 *      NUNCA alerta: é um estado que se resolve sozinho no próximo ciclo.
 *      Qualquer outra ilegibilidade é `warning`: cegueira é defeito.
 *  K5. `reconciled` e `settling` não emitem. Silêncio é o estado saudável, e
 *      "não emitiu" jamais é apresentado como "conferido e íntegro".
 *  K6. Cooldown deriva da cadência da rotina, sempre dentro de piso e teto.
 *      O crítico usa **metade** da cadência (com o mesmo piso), porque um
 *      órfão que persiste precisa reaparecer antes de o operador esquecer.
 *  K7. A chave da rotina é estável e prefixada (`admission_reconcile:`), para
 *      que reconhecimento, escalada e retenção do barramento a tratem como
 *      uma fonte só, distinta do fan-in de passivo (`admission_backlog:`).
 *  K8. Nenhum alerta é redigido sem os números que o sustentam: estoque
 *      vencido, deriva medida, passivo declarado e órfão resultante viajam
 *      no `detail` e aparecem na frase. Acusação sem número não é auditável.
 *
 * Módulo **puro**: não conhece banco, React nem relógio global. É a fonte da
 * verdade espelhada por `public.admission_reconcile_severity()` /
 * `public.evaluate_admission_reconcile_alerts()` e conferida no CI por
 * `scripts/check-admission-orphan.ts`.
 */

import type { ReconcileSnapshot, ReconcileVerdict } from './admissionReconciliation.ts';

/** Severidade aceita pelo barramento de manutenção. */
export type OrphanAlertSeverity = 'warning' | 'critical';

/** Prefixo da chave de rotina — nunca colide com o fan-in de passivo. */
export const ADMISSION_RECONCILE_PREFIX = 'admission_reconcile:';

/** Job supervisionado por esta régua. */
export const ADMISSION_RECONCILE_JOB = 'ledger_stock';

/** Cadência da conciliação (cron diário, espelhado no SQL). */
export const RECONCILE_CADENCE_MINUTES = 24 * 60;

/** Piso e teto do cooldown, em minutos. */
export const COOLDOWN_FLOOR_MINUTES = 60;
export const COOLDOWN_CEILING_MINUTES = 1440;

/** Motivo de ilegibilidade que NUNCA alerta (K4). */
export const BENIGN_RACE_REASON = 'inventario_anterior_a_execucao';

/** K7 — chave prefixada e estável. */
export function admissionReconcileRoutineKey(job: string = ADMISSION_RECONCILE_JOB): string {
  return `${ADMISSION_RECONCILE_PREFIX}${job}`;
}

/**
 * K1–K5 — severidade derivada do veredito. `null` significa "não emite".
 *
 * `reason` só importa para `indeterminate`: distingue a corrida benigna (J2)
 * de cegueira estrutural.
 */
export function orphanAlertSeverity(
  verdict: ReconcileVerdict,
  reason: string | null = null,
): OrphanAlertSeverity | null {
  switch (verdict) {
    case 'unaccounted':
      return 'critical'; // K2
    case 'no_run':
      return 'warning'; // K3
    case 'indeterminate':
      return reason === BENIGN_RACE_REASON ? null : 'warning'; // K4
    case 'reconciled':
    case 'settling':
      return null; // K5
    default:
      return null;
  }
}

/**
 * K6 — cooldown derivado da cadência, sempre dentro do piso e do teto.
 * Cadência inválida é erro de programação, não silêncio: falha alto.
 */
export function orphanCooldownMinutes(
  cadenceMinutes: number,
  severity: OrphanAlertSeverity,
): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadência inválida para cooldown: ${cadenceMinutes}`);
  }
  const base = severity === 'critical' ? Math.round(cadenceMinutes / 2) : Math.round(cadenceMinutes);
  return Math.min(COOLDOWN_CEILING_MINUTES, Math.max(COOLDOWN_FLOOR_MINUTES, base));
}

/** Alerta candidato a ser gravado no barramento de manutenção. */
export interface OrphanAlert {
  readonly routine: string;
  readonly severity: OrphanAlertSeverity;
  readonly verdict: ReconcileVerdict;
  readonly reason: string;
  readonly cooldownMinutes: number;
  readonly detail: {
    readonly job_name: string;
    readonly verdict: ReconcileVerdict;
    readonly orphan_count: number;
    readonly expired_stock: number;
    readonly drift_stock: number;
    readonly declared_deferred: number;
    readonly accounted_for: number;
    readonly quarantined_stock: number;
    readonly total_stock: number;
    readonly diagnosis: string | null;
    readonly cadence_minutes: number;
    readonly cooldown_minutes: number;
  };
  /** Instante observado — a foto do inventário que originou a acusação. */
  readonly observedAt: number | null;
}

export interface BuildOrphanAlertOptions {
  readonly cadenceMinutes?: number;
  readonly job?: string;
  readonly label?: string;
}

const DEFAULT_LABEL = 'Conciliação do livro de admissão';

/** K8 — redige em PT-BR sempre com os números que sustentam a acusação. */
function renderReason(
  label: string,
  snapshot: ReconcileSnapshot,
  cadence: number,
): string {
  switch (snapshot.verdict) {
    case 'unaccounted':
      return (
        `${label}: ${snapshot.orphanCount} janela(s) vencida(s) sem dono — ` +
        `estoque vencido ${snapshot.expiredStock}, dívida assumida ${snapshot.accountedFor} ` +
        `(passivo declarado ${snapshot.declaredDeferred} + deriva ${snapshot.driftStock}), ` +
        `cadência ${cadence} min`
      );
    case 'no_run':
      return (
        `${label}: ${snapshot.expiredStock} janela(s) vencida(s) no estoque sem execução ` +
        `legível da rotina — cadência ${cadence} min`
      );
    case 'indeterminate':
      return (
        `${label}: inventário ilegível (${snapshot.reason ?? 'motivo não declarado'}) — ` +
        `estoque não pôde ser conferido, cadência ${cadence} min`
      );
    default:
      return `${label}: ${snapshot.label} — cadência ${cadence} min`;
  }
}

/**
 * Converte o retrato da conciliação (Onda 233) em alerta de manutenção.
 * Retorna `null` quando o veredito não alerta (K4/K5). Nunca lança, exceto
 * quando a cadência informada é inválida (K6).
 */
export function buildOrphanAlert(
  snapshot: ReconcileSnapshot | null | undefined,
  options: BuildOrphanAlertOptions = {},
): OrphanAlert | null {
  if (!snapshot) return null;

  const severity = orphanAlertSeverity(snapshot.verdict, snapshot.reason);
  if (severity === null) return null;

  const cadence =
    typeof options.cadenceMinutes === 'number' && Number.isFinite(options.cadenceMinutes)
      ? options.cadenceMinutes
      : RECONCILE_CADENCE_MINUTES;
  const cooldown = orphanCooldownMinutes(cadence, severity);
  const job = options.job ?? ADMISSION_RECONCILE_JOB;
  const label = options.label ?? DEFAULT_LABEL;

  return {
    routine: admissionReconcileRoutineKey(job),
    severity,
    verdict: snapshot.verdict,
    reason: renderReason(label, snapshot, Math.round(cadence)),
    cooldownMinutes: cooldown,
    detail: {
      job_name: job,
      verdict: snapshot.verdict,
      orphan_count: snapshot.orphanCount,
      expired_stock: snapshot.expiredStock,
      drift_stock: snapshot.driftStock,
      declared_deferred: snapshot.declaredDeferred,
      accounted_for: snapshot.accountedFor,
      quarantined_stock: snapshot.quarantinedStock,
      total_stock: snapshot.totalStock,
      diagnosis: snapshot.reason,
      cadence_minutes: Math.round(cadence),
      cooldown_minutes: cooldown,
    },
    observedAt: snapshot.observedAt,
  };
}
