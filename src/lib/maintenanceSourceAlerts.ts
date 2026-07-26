/**
 * Onda 114 — Fan-in dos detectores especializados para o barramento de alertas
 * de manutenção (Onda 110) e, por consequência, para o despachante externo
 * (Onda 111).
 *
 * Contexto do problema:
 * as Ondas 112 (relógio de câmera) e 113 (tendência do backlog da partição
 * DEFAULT) produzem vereditos ricos, mas mudos: ficam no banco e só aparecem
 * se alguém abrir a página de operações. Este módulo traduz esses vereditos em
 * *candidatos a alerta* no mesmo vocabulário que `maintenance_alert_events` já
 * entende (`routine` / `severity` / `reason` / `detail`), reaproveitando de
 * graça a deduplicação, o cooldown e o backoff já existentes.
 *
 * Princípio de projeto (o mesmo da Onda 113): esta é a ÚNICA fonte de verdade
 * da classificação. O SQL apenas coleta os fatos brutos; o gate de CI e a UI
 * importam daqui. Duplicar a regra em PL/pgSQL abriria a porta clássica para o
 * painel dizer "OK" enquanto o Telegram grita "crítico".
 */

/** Severidade aceita por `maintenance_alert_events` (não existe 'ok' lá). */
export type MaintenanceSeverity = 'warning' | 'critical';

/** Rotinas sintéticas introduzidas pela Onda 114. */
export type MaintenanceSourceRoutine = 'camera_clock_skew' | 'partition_backlog_trend';

/** Limiares do fan-in. Expostos para o simulador varrer o espaço de parâmetros. */
export interface MaintenanceSourceThresholds {
  /** Acima disso, a última execução do detector é considerada obsoleta. */
  readonly staleHours: number;
  /** Horizonte de saturação abaixo do qual o backlog vira crítico imediato. */
  readonly saturationCriticalHours: number;
}

export const DEFAULT_MAINTENANCE_SOURCE_THRESHOLDS: MaintenanceSourceThresholds = {
  // Alinhado ao `stale_hours` de `evaluate_maintenance_alerts` (Onda 110):
  // divergir aqui faria a mesma rotina ser "velha" para um avaliador e "nova"
  // para o outro.
  staleHours: 48,
  saturationCriticalHours: 24,
};

/** Retrato da execução mais recente de `detect_camera_clock_skew` (Onda 112). */
export interface ClockSkewRunSnapshot {
  /** Instante da execução em ms epoch; `null` quando nunca executou. */
  readonly ranAtMs: number | null;
  readonly ok: boolean;
  readonly errorDetail?: string | null;
  readonly camerasAnalyzed: number;
  readonly camerasWarning: number;
  readonly camerasCritical: number;
}

/**
 * Veredito de backlog reduzido ao que o fan-in precisa. Estruturalmente
 * compatível com `BacklogVerdict` da Onda 113 — aceitar o subconjunto evita
 * acoplar este módulo à evolução daquela interface.
 */
export interface BacklogVerdictLike {
  readonly parent: string;
  readonly severity: 'ok' | 'warning' | 'critical';
  readonly currentRows: number;
  readonly hoursToSaturation: number | null;
  readonly stale: boolean;
  readonly reasons?: readonly string[];
}

export interface MaintenanceSourceInput {
  /** Referência temporal. Injetada para tornar a simulação determinística. */
  readonly nowMs: number;
  /** `null` quando a tabela de execuções está vazia (detector nunca rodou). */
  readonly clockSkewRun: ClockSkewRunSnapshot | null;
  /** Vereditos por pai particionado. Vazio == coletor cego. */
  readonly backlogVerdicts: readonly BacklogVerdictLike[];
  readonly thresholds?: MaintenanceSourceThresholds;
}

/** Candidato pronto para virar linha em `maintenance_alert_events`. */
export interface MaintenanceAlertCandidate {
  readonly routine: MaintenanceSourceRoutine;
  readonly severity: MaintenanceSeverity;
  readonly reason: string;
  readonly detail: Readonly<Record<string, unknown>>;
  /** Instante do fato observado; `null` quando não há execução de referência. */
  readonly observedAtMs: number | null;
}

const HOUR_MS = 3_600_000;

function ageHours(nowMs: number, ranAtMs: number): number {
  // Relógio do banco pode recuar (NTP step). Idade negativa não é "futuro
  // suspeito" para efeito de alerta: tratamos como recém-executado.
  return Math.max(0, (nowMs - ranAtMs) / HOUR_MS);
}

function roundHours(hours: number): string {
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1);
}

/**
 * Avalia o detector de desvio de relógio (Onda 112).
 * Ordem das regras = ordem de gravidade: um detector quebrado tem precedência
 * sobre o que ele por acaso conseguiu medir antes de quebrar.
 */
function evaluateClockSkew(
  input: MaintenanceSourceInput,
  thresholds: MaintenanceSourceThresholds,
): MaintenanceAlertCandidate | null {
  const run = input.clockSkewRun;
  const routine: MaintenanceSourceRoutine = 'camera_clock_skew';

  if (run === null || run.ranAtMs === null) {
    return {
      routine,
      severity: 'critical',
      reason: 'detector de relógio nunca executou',
      detail: { never_ran: true },
      observedAtMs: null,
    };
  }

  const age = ageHours(input.nowMs, run.ranAtMs);

  if (age > thresholds.staleHours) {
    return {
      routine,
      severity: 'critical',
      reason: `detector de relógio sem execução há ${roundHours(age)}h (limite ${thresholds.staleHours}h)`,
      detail: { stale: true, age_hours: Number(age.toFixed(2)) },
      observedAtMs: run.ranAtMs,
    };
  }

  if (!run.ok) {
    const suffix = run.errorDetail ? `: ${run.errorDetail}` : '';
    return {
      routine,
      severity: 'critical',
      reason: `última varredura de relógio falhou${suffix}`,
      detail: { ok: false, error_detail: run.errorDetail ?? null },
      observedAtMs: run.ranAtMs,
    };
  }

  if (run.camerasCritical > 0) {
    return {
      routine,
      severity: 'critical',
      reason: `${run.camerasCritical} câmera(s) com relógio criticamente dessincronizado`,
      detail: {
        cameras_critical: run.camerasCritical,
        cameras_warning: run.camerasWarning,
        cameras_analyzed: run.camerasAnalyzed,
      },
      observedAtMs: run.ranAtMs,
    };
  }

  if (run.camerasWarning > 0) {
    return {
      routine,
      severity: 'warning',
      reason: `${run.camerasWarning} câmera(s) com desvio de relógio acima do tolerado`,
      detail: {
        cameras_critical: 0,
        cameras_warning: run.camerasWarning,
        cameras_analyzed: run.camerasAnalyzed,
      },
      observedAtMs: run.ranAtMs,
    };
  }

  return null;
}

/**
 * Avalia a tendência do backlog (Onda 113).
 * Emite no máximo um candidato: o pior pai particionado. Alertar por pai
 * inundaria o Telegram quando uma causa comum (drenagem parada) degrada todas
 * as séries ao mesmo tempo.
 */
function evaluateBacklog(
  input: MaintenanceSourceInput,
  thresholds: MaintenanceSourceThresholds,
): MaintenanceAlertCandidate | null {
  const routine: MaintenanceSourceRoutine = 'partition_backlog_trend';
  const verdicts = input.backlogVerdicts;

  if (verdicts.length === 0) {
    return {
      routine,
      severity: 'critical',
      reason: 'coletor de backlog cego: nenhuma série disponível',
      detail: { blind: true },
      observedAtMs: null,
    };
  }

  const stale = verdicts.filter((v) => v.stale);
  if (stale.length > 0) {
    return {
      routine,
      severity: 'critical',
      reason: `coletor de backlog obsoleto em ${stale.length} série(s): ${stale
        .map((v) => v.parent)
        .join(', ')}`,
      detail: { stale_parents: stale.map((v) => v.parent) },
      observedAtMs: null,
    };
  }

  const criticals = verdicts.filter((v) => v.severity === 'critical');
  if (criticals.length > 0) {
    // Pior = satura antes. `null` (sem projeção) vai para o fim da fila, pois
    // "crítico por volume" é menos urgente que "crítico por saturação iminente".
    const worst = [...criticals].sort(
      (a, b) => (a.hoursToSaturation ?? Number.POSITIVE_INFINITY) - (b.hoursToSaturation ?? Number.POSITIVE_INFINITY),
    )[0];
    const eta =
      worst.hoursToSaturation !== null && worst.hoursToSaturation <= thresholds.saturationCriticalHours
        ? `, satura em ~${roundHours(worst.hoursToSaturation)}h`
        : '';
    return {
      routine,
      severity: 'critical',
      reason: `backlog crítico em ${worst.parent}: ${worst.currentRows} linhas na DEFAULT${eta}`,
      detail: {
        parent: worst.parent,
        current_rows: worst.currentRows,
        hours_to_saturation: worst.hoursToSaturation,
        critical_parents: criticals.map((v) => v.parent),
      },
      observedAtMs: null,
    };
  }

  const warnings = verdicts.filter((v) => v.severity === 'warning');
  if (warnings.length > 0) {
    const worst = warnings[0];
    return {
      routine,
      severity: 'warning',
      reason: `backlog em crescimento em ${warnings.length} série(s), pior caso ${worst.parent} com ${worst.currentRows} linhas`,
      detail: {
        parent: worst.parent,
        current_rows: worst.currentRows,
        warning_parents: warnings.map((v) => v.parent),
      },
      observedAtMs: null,
    };
  }

  return null;
}

/**
 * Ponto de entrada do fan-in. Retorna no máximo um candidato por rotina,
 * em ordem estável (relógio, depois backlog) para tornar o diff de testes e
 * simulações previsível.
 */
export function evaluateMaintenanceSources(
  input: MaintenanceSourceInput,
): readonly MaintenanceAlertCandidate[] {
  const thresholds = input.thresholds ?? DEFAULT_MAINTENANCE_SOURCE_THRESHOLDS;
  const out: MaintenanceAlertCandidate[] = [];

  const skew = evaluateClockSkew(input, thresholds);
  if (skew) out.push(skew);

  const backlog = evaluateBacklog(input, thresholds);
  if (backlog) out.push(backlog);

  return out;
}

/** Rótulo PT-BR das rotinas sintéticas, para a UI de alertas de manutenção. */
export const MAINTENANCE_SOURCE_LABELS: Record<MaintenanceSourceRoutine, string> = {
  camera_clock_skew: 'Relógio das câmeras',
  partition_backlog_trend: 'Tendência do backlog',
};
