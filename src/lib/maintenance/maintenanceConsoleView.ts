/**
 * Onda 136 — Console humano dos alertas de manutenção.
 *
 * ## O defeito que esta onda corrige
 *
 * As Ondas 110 a 135 construíram a cadeia completa de detecção → despacho →
 * escalonamento. Faltava a última perna, e ela é a mais importante: **o humano
 * não tinha onde reconhecer o alerta**. `public.acknowledge_maintenance_alert()`
 * existia desde a Onda 117, mas nenhuma linha de `src/` a chamava. Na prática:
 *
 *  - `acknowledged_at` nunca era preenchido por ninguém;
 *  - portanto a escada da Onda 117 subia SEMPRE até o teto (`paged` para
 *    `critical`), mesmo com o incidente já resolvido;
 *  - e o cooldown do fan-in (Onda 135) reemitia indefinidamente.
 *
 * O sistema estava desenhado para "fechar o incidente" e não tinha botão de
 * fechar. Este módulo é o modelo de exibição dessa tela — puro, sem React e sem
 * rede, para que centenas de cenários possam ser varridos no CI.
 *
 * ## Regras
 *
 *  - **Reconhecer é ato de admin e é irreversível.** Não existe "desreconhecer":
 *    o tempo até o reconhecimento é uma métrica de operação e reescrevê-la
 *    apagaria a prova. Uma reincidência gera um alerta NOVO, não a reabertura
 *    do antigo.
 *  - **A tela nunca decide autoridade.** O botão pode aparecer e o banco ainda
 *    recusar (perda de papel entre o carregamento e o clique). Quem manda é o
 *    `RAISE EXCEPTION` do RPC; a tela só traduz.
 *  - **Ordenação por urgência, não por data.** Aberto antes de reconhecido,
 *    depois `critical` antes de `warning`, depois nível de escalonamento
 *    decrescente, depois o mais velho primeiro. Empate final pelo `id` para dar
 *    ordem determinística (I5).
 *  - **A previsão do próximo degrau usa os MESMOS limiares do cron**
 *    (`DEFAULT_ESCALATION_THRESHOLDS`). Duplicar a régua aqui reproduziria o
 *    erro clássico de painel e rotina discordando.
 *
 * Invariantes varridas pelos testes:
 *   I1 alerta reconhecido nunca oferece ação nem previsão de degrau
 *   I2 alerta no teto da severidade não tem previsão de degrau
 *   I3 previsão nunca é negativa
 *   I4 envelhecer um alerta nunca aumenta a previsão do próximo degrau
 *   I5 a ordenação é total, determinística e estável a permutações da entrada
 *   I6 o resumo bate com a contagem das linhas classificadas
 */

import {
  DEFAULT_ESCALATION_THRESHOLDS,
  ESCALATION_LEVEL_LABELS,
  type EscalationLevel,
  type EscalationThresholds,
  type MaintenanceSeverity,
} from '@/lib/maintenanceEscalation';

const MINUTE_MS = 60_000;

/** Linha crua de `public.maintenance_alert_events`, como o PostgREST devolve. */
export interface MaintenanceAlertRow {
  readonly id: string;
  readonly routine: string;
  readonly severity: string;
  readonly reason: string;
  readonly detail: Record<string, unknown> | null;
  readonly created_at: string;
  readonly observed_at: string | null;
  readonly acknowledged_at: string | null;
  readonly acknowledged_by: string | null;
  readonly escalation_level: number;
  readonly last_escalated_at: string | null;
}

export type MaintenanceAlertStatus = 'open' | 'acknowledged';

export interface MaintenanceAlertView {
  readonly id: string;
  readonly routine: string;
  readonly severity: MaintenanceSeverity;
  readonly reason: string;
  readonly status: MaintenanceAlertStatus;
  readonly level: EscalationLevel;
  readonly levelLabel: string;
  /** Idade em minutos, nunca negativa (relógio recuado vira 0). */
  readonly ageMinutes: number;
  /** Minutos até o próximo degrau; `null` quando não há degrau possível. */
  readonly minutesToNextLevel: number | null;
  /** Só alertas abertos podem ser reconhecidos. */
  readonly canAcknowledge: boolean;
  readonly acknowledgedAtMs: number | null;
}

export interface MaintenanceConsoleSummary {
  readonly total: number;
  readonly open: number;
  readonly openCritical: number;
  readonly openWarning: number;
  readonly acknowledged: number;
  /** Abertos que já atingiram o teto da escada — ninguém mais será avisado. */
  readonly atCeiling: number;
  /** Severidade agregada da tela, para o cabeçalho. */
  readonly worst: 'ok' | MaintenanceSeverity;
}

export interface MaintenanceConsoleModel {
  readonly rows: readonly MaintenanceAlertView[];
  readonly summary: MaintenanceConsoleSummary;
}

function parseMs(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function normalizeSeverity(value: string): MaintenanceSeverity {
  // A coluna tem CHECK constraint, mas dado vindo da rede é dado não confiável:
  // o desconhecido sobe para `critical` porque subestimar um incidente é o erro
  // caro, e superestimar apenas gera uma verificação humana a mais.
  return value === 'warning' ? 'warning' : 'critical';
}

function normalizeLevel(value: number): EscalationLevel {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 3) return 3;
  return (Math.round(value) === 1 ? 1 : 2) as EscalationLevel;
}

/**
 * Minutos até o próximo degrau, ou `null` quando não haverá degrau.
 *
 * Duas barreiras somam-se: a idade mínima do nível de destino e o intervalo
 * mínimo desde o último degrau (`minStepMinutes`). Reportamos a MAIOR das duas
 * esperas — é a que de fato governa o instante do próximo passo.
 */
export function minutesToNextLevel(
  severity: MaintenanceSeverity,
  level: EscalationLevel,
  ageMin: number,
  minutesSinceLastStep: number | null,
  thresholds: EscalationThresholds = DEFAULT_ESCALATION_THRESHOLDS,
): number | null {
  const ceiling = thresholds.maxLevel[severity];
  if (level >= ceiling) return null;

  const nextLevel = level + 1;
  const required = thresholds.ageMinutesByLevel[severity][nextLevel];
  if (required === undefined || !Number.isFinite(required)) return null;

  const waitByAge = Math.max(0, required - ageMin);
  const waitByStep =
    minutesSinceLastStep === null
      ? 0
      : Math.max(0, thresholds.minStepMinutes - minutesSinceLastStep);

  return Math.round(Math.max(waitByAge, waitByStep) * 10) / 10;
}

function compareRows(a: MaintenanceAlertView, b: MaintenanceAlertView): number {
  // Aberto sempre antes de reconhecido: o trabalho pendente é o que importa.
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
  if (a.level !== b.level) return b.level - a.level;
  if (a.ageMinutes !== b.ageMinutes) return b.ageMinutes - a.ageMinutes;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function buildMaintenanceConsole(
  rows: readonly MaintenanceAlertRow[],
  nowMs: number,
  thresholds: EscalationThresholds = DEFAULT_ESCALATION_THRESHOLDS,
): MaintenanceConsoleModel {
  const views: MaintenanceAlertView[] = rows.map((row) => {
    const createdMs = parseMs(row.created_at) ?? nowMs;
    const acknowledgedAtMs = parseMs(row.acknowledged_at);
    const lastStepMs = parseMs(row.last_escalated_at);
    const severity = normalizeSeverity(row.severity);
    const level = normalizeLevel(row.escalation_level);
    const status: MaintenanceAlertStatus = acknowledgedAtMs === null ? 'open' : 'acknowledged';
    const ageMin = Math.max(0, (nowMs - createdMs) / MINUTE_MS);

    return {
      id: row.id,
      routine: row.routine,
      severity,
      reason: row.reason,
      status,
      level,
      levelLabel: ESCALATION_LEVEL_LABELS[level],
      ageMinutes: Math.round(ageMin * 10) / 10,
      // Reconhecer congela a escada (Onda 117): previsão deixa de existir.
      minutesToNextLevel:
        status === 'acknowledged'
          ? null
          : minutesToNextLevel(
              severity,
              level,
              ageMin,
              lastStepMs === null ? null : Math.max(0, (nowMs - lastStepMs) / MINUTE_MS),
              thresholds,
            ),
      canAcknowledge: status === 'open',
      acknowledgedAtMs,
    };
  });

  views.sort(compareRows);

  const open = views.filter((view) => view.status === 'open');
  const openCritical = open.filter((view) => view.severity === 'critical').length;
  const atCeiling = open.filter((view) => view.level >= thresholds.maxLevel[view.severity]).length;

  return {
    rows: views,
    summary: {
      total: views.length,
      open: open.length,
      openCritical,
      openWarning: open.length - openCritical,
      acknowledged: views.length - open.length,
      atCeiling,
      worst: openCritical > 0 ? 'critical' : open.length > 0 ? 'warning' : 'ok',
    },
  };
}
