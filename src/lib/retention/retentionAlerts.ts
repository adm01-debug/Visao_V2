/**
 * Onda 135 — Fan-in das rotinas de retenção para o barramento de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 134 deu visibilidade às rotinas de expurgo: o painel passou a mostrar
 * quando uma delas para. Mas visibilidade é passiva — depende de alguém abrir
 * a tela. As rotinas de retenção apagam dado pessoal por obrigação legal
 * (LGPD); se o cron morre num sábado, o silêncio só aparece na segunda, e o
 * dado que deveria ter sido apagado continuou vivo por dois dias.
 *
 * Detecção sem notificação é equivalente a não detectar. Esta onda liga o
 * registro de retenção ao mesmo barramento (`maintenance_alert_events`) já
 * usado pelos detectores de partição/relógio, herdando de graça o despacho
 * externo (Onda 111) e a escada de escalonamento (Onda 117).
 *
 * ## As regras
 *
 * 1. **Severidade deriva da saúde**, não de limiar próprio: `stalled` e
 *    `never` são `critical` (rotina de apagamento parada é risco de
 *    conformidade); `warn` é `warning`; `ok` não emite nada.
 * 2. **Cooldown deriva da cadência**, com piso e teto. Uma rotina horária não
 *    pode gerar 24 avisos por dia, e uma diária não pode ficar 6 horas em
 *    silêncio depois de parar. Piso de 60 min, teto de 360 min.
 * 3. **Chave de rotina prefixada** (`retention:<job>`), para que o barramento
 *    nunca colida com um detector homônimo e para que o despacho consiga
 *    agrupar a família inteira por prefixo.
 *
 * Esta é a fonte da verdade espelhada por `public.evaluate_retention_alerts()`;
 * a paridade é conferida no CI por `scripts/check-retention-alerts.mjs`.
 */

import {
  RETENTION_ROUTINES,
  classifyRetentionHealth,
  type RetentionHealth,
  type RetentionRoutine,
} from './retentionRegistry.ts';

/** Severidades aceitas pelo barramento (`maintenance_alert_events`). */
export type MaintenanceSeverity = 'warning' | 'critical';

/** Prefixo aplicado à chave de rotina emitida no barramento. */
export const RETENTION_ROUTINE_PREFIX = 'retention:';

/** Piso do cooldown, em minutos — evita enxurrada em rotinas de alta cadência. */
export const COOLDOWN_FLOOR_MINUTES = 60;

/** Teto do cooldown, em minutos — evita silêncio longo em rotinas diárias. */
export const COOLDOWN_CEILING_MINUTES = 360;

/** Fato observado sobre uma rotina de expurgo. */
export interface RetentionObservation {
  /** `job_name` conforme o registro da Onda 134. */
  readonly jobName: string;
  /** Minutos desde a última execução; `null` quando nunca executou. */
  readonly minutesSinceLastRun: number | null;
  /**
   * Minutos desde o registro da rotina (Onda 244). `null`/omitido quando não
   * há âncora legível — nesse caso a ausência de execução volta a ser crítica.
   */
  readonly minutesSinceRegistration?: number | null;
}

/** Alerta candidato a ser gravado no barramento de manutenção. */
export interface RetentionAlertCandidate {
  /** Chave completa, já prefixada. */
  readonly routine: string;
  readonly severity: MaintenanceSeverity;
  readonly reason: string;
  readonly health: RetentionHealth;
  /** Janela de supressão de duplicatas, em minutos. */
  readonly cooldownMinutes: number;
}

/** Chave de barramento de uma rotina de retenção. */
export function retentionRoutineKey(jobName: string): string {
  return `${RETENTION_ROUTINE_PREFIX}${jobName}`;
}

/**
 * Cooldown aplicado a uma rotina, derivado da cadência e travado entre piso e
 * teto. Monotônico não-decrescente em `cadenceMinutes` por construção.
 */
export function retentionCooldownMinutes(cadenceMinutes: number): number {
  if (!Number.isFinite(cadenceMinutes) || cadenceMinutes <= 0) {
    throw new RangeError(`cadenceMinutes deve ser positivo e finito, recebido: ${cadenceMinutes}`);
  }
  return Math.min(
    COOLDOWN_CEILING_MINUTES,
    Math.max(COOLDOWN_FLOOR_MINUTES, Math.round(cadenceMinutes))
  );
}

/** Severidade correspondente a cada estado de saúde; `null` = nada a emitir. */
export function severityForHealth(health: RetentionHealth): MaintenanceSeverity | null {
  switch (health) {
    case 'stalled':
    case 'never':
      return 'critical';
    case 'warn':
      return 'warning';
    // Estreia pendente é estado esperado, não defeito: emitir aqui seria
    // transformar toda rotina nova num crítico falso na primeira hora.
    case 'pending_first_run':
    case 'ok':
      return null;
  }
}

/** Texto humano, em português, explicando o motivo do alerta. */
function reasonFor(
  routine: RetentionRoutine,
  health: RetentionHealth,
  minutesSinceLastRun: number | null
): string {
  if (health === 'never') {
    return `${routine.label}: rotina de expurgo nunca executou (cadência esperada de ${routine.cadenceMinutes} min)`;
  }
  const silence = Math.max(0, Math.round(minutesSinceLastRun ?? 0));
  const suffix = `(cadência ${routine.cadenceMinutes} min)`;
  return health === 'stalled'
    ? `${routine.label}: expurgo parado há ${silence} min ${suffix}`
    : `${routine.label}: expurgo atrasado há ${silence} min ${suffix}`;
}

/**
 * Converte observações em alertas candidatos.
 *
 * Observações de rotinas não registradas são ignoradas de propósito: o gate da
 * Onda 134 já falha o CI quando existe tabela de expurgo fora do registro, e
 * emitir alerta de rotina desconhecida só polui o barramento.
 *
 * Rotinas registradas SEM observação correspondente são tratadas como
 * `never` — a ausência do fato é, ela própria, o fato mais grave —, exceto
 * durante a carência de estreia (Onda 244).
 */
export function evaluateRetentionAlerts(
  observations: readonly RetentionObservation[],
  routines: readonly RetentionRoutine[] = RETENTION_ROUTINES
): RetentionAlertCandidate[] {
  const byJob = new Map<string, RetentionObservation>();
  for (const observation of observations) {
    byJob.set(observation.jobName, observation);
  }

  const candidates: RetentionAlertCandidate[] = [];
  for (const routine of routines) {
    const observation = byJob.get(routine.jobName);
    const minutes = observation ? observation.minutesSinceLastRun : null;
    const age = observation?.minutesSinceRegistration ?? null;
    const health = classifyRetentionHealth(minutes, routine.cadenceMinutes, age);
    const severity = severityForHealth(health);
    if (severity === null) continue;
    candidates.push({
      routine: retentionRoutineKey(routine.jobName),
      severity,
      health,
      reason: reasonFor(routine, health, minutes),
      cooldownMinutes: retentionCooldownMinutes(routine.cadenceMinutes),
    });
  }
  return candidates;
}
