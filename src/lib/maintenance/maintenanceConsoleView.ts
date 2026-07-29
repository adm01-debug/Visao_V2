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
import {
  buildConditionStreak,
  escalationProfileFor,
  type EscalationProfile,
} from '@/lib/escalationProfiles';
import { readOwnerRouting, type OwnerRouting } from '@/lib/maintenance/maintenanceOwner';
import type { AcknowledgementState } from '@/lib/maintenance/acknowledgementDecay';
import {
  escalationAckGate,
  escalationAckLabel,
} from '@/lib/maintenance/escalationAckGate';

import {
  buildConditionSilence,
  indexConditionNotices,
  type ConditionNoticeRow,
  type ConditionSilenceView,
} from '@/lib/maintenance/conditionSilence';


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
  /**
   * Onda 147 — responsável derivado de `detail.owner`. `null` para as rotinas
   * anteriores ao roteamento por culpa, que continuam válidas sem endereço.
   */
  readonly routing: OwnerRouting | null;
  /** Onda 239 — perfil de urgência efetivamente aplicado pelo cron. */
  readonly profileId: string;
  readonly profileLabel: string;
  /**
   * Onda 239 — idade da CONDIÇÃO (âncora da sequência) em minutos, para
   * perfis ancorados em `streak`. `null` quando a âncora é a própria linha.
   */
  readonly conditionAgeMinutes: number | null;
  /** Quantidade de linhas abertas da mesma chave na sequência (P6). */
  readonly conditionRows: number;
  /**
   * Nível efetivo considerado pela escada: o maior já alcançado na sequência
   * quando o perfil ancora na condição (O4), senão o nível da própria linha.
   */
  readonly effectiveLevel: EscalationLevel;
  /**
   * Onda 241 — silêncio ativo por condição no despacho externo. `null` quando
   * a fonte não tem janela de silêncio, quando nunca houve entrega ou quando o
   * alerta já foi reconhecido (R2/R7/R8).
   */
  readonly silence: ConditionSilenceView | null;
  /**
   * Onda 249 — estado do reconhecimento perante a escada. `none` para alertas
   * abertos; para reconhecidos, diz se a promessa ainda vale (`pending`), se
   * foi cumprida (`honored`) ou se **decaiu** e devolveu o alerta à escada.
   */
  readonly ackState: AcknowledgementState;
  /** Frase pronta para o operador (Y10) — nunca um booleano nu. */
  readonly ackLabel: string;
  /** `true` quando a promessa quebrou: o alerta voltou a escalar. */
  readonly ackDecayed: boolean;
  /** Minutos restantes de silêncio acordado; `null` quando não se aplica. */
  readonly ackMinutesRemaining: number | null;
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
  /** Onda 239 — abertos governados por perfil lento (contabilidade diária). */
  readonly slowProfile: number;
  /** Onda 241 — abertos cuja condição está calada no despacho externo agora. */
  readonly silenced: number;
  /** Onda 241 — abertos que só voltam a notificar por agravamento (R4). */
  readonly silenceBrokenByEscalation: number;
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

/**
 * Onda 239 — mesma previsão, porém regida pelo PERFIL da fonte.
 *
 * Este é o defeito que a onda corrige: depois da Onda 238 o cron passou a usar
 * a escada do perfil, mas o painel continuou prometendo o degrau em 30 minutos
 * para uma fonte diária. Painel e rotina discordando é pior que painel ausente,
 * porque a discordância parece informação.
 */
export function minutesToNextLevelForProfile(
  profile: EscalationProfile,
  severity: MaintenanceSeverity,
  level: EscalationLevel,
  ageMin: number,
  minutesSinceLastStep: number | null,
): number | null {
  if (level >= profile.maxLevel[severity]) return null;

  const required = profile.ladderMinutes[severity][level + 1];
  if (required === undefined || required === null || !Number.isFinite(required)) return null;

  const waitByAge = Math.max(0, required - ageMin);
  const waitByStep =
    minutesSinceLastStep === null
      ? 0
      : Math.max(0, profile.minStepMinutes - minutesSinceLastStep);

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
  notices: readonly ConditionNoticeRow[] = [],
): MaintenanceConsoleModel {
  // Onda 241 — índice de entregas externas por (condição, canal).
  const noticeIndex = indexConditionNotices(notices, nowMs);

  // P2 — a sequência é apurada por CHAVE de rotina, exatamente como o SQL da
  // Onda 238 faz. Duas chaves distintas nunca compartilham âncora.
  const streaks = new Map<string, ReturnType<typeof buildConditionStreak>>();
  const grouped = new Map<
    string,
    Array<{ createdAtMs: number; acknowledgedAtMs: number | null; escalationLevel: EscalationLevel }>
  >();
  for (const row of rows) {
    const bucket = grouped.get(row.routine) ?? [];
    bucket.push({
      createdAtMs: parseMs(row.created_at) ?? nowMs,
      acknowledgedAtMs: parseMs(row.acknowledged_at),
      escalationLevel: normalizeLevel(row.escalation_level),
    });
    grouped.set(row.routine, bucket);
  }
  for (const [routine, bucket] of grouped) {
    streaks.set(routine, buildConditionStreak(bucket));
  }

  const views: MaintenanceAlertView[] = rows.map((row) => {
    const createdMs = parseMs(row.created_at) ?? nowMs;
    const acknowledgedAtMs = parseMs(row.acknowledged_at);
    const lastStepMs = parseMs(row.last_escalated_at);
    const severity = normalizeSeverity(row.severity);
    const level = normalizeLevel(row.escalation_level);
    const status: MaintenanceAlertStatus = acknowledgedAtMs === null ? 'open' : 'acknowledged';
    const ageMin = Math.max(0, (nowMs - createdMs) / MINUTE_MS);
    const profile = escalationProfileFor(row.routine);

    // Onda 249 (Y1/Y9) — a condição persiste quando a fonte reemitiu a mesma
    // rotina DEPOIS do reconhecimento. Medida no mundo (outras linhas), nunca
    // declarada pelo operador; sem evidência, `null` → a Y9 assume persistir.
    const conditionPersists =
      acknowledgedAtMs === null
        ? null
        : rows.some(
            (other) =>
              other.routine === row.routine &&
              (parseMs(other.created_at) ?? 0) > acknowledgedAtMs,
          ) || null;

    const ackGate = escalationAckGate(
      {
        acknowledgedAtMs,
        severityNow: severity,
        ack:
          acknowledgedAtMs === null
            ? null
            : {
                acknowledgedBy: row.acknowledged_by,
                severityAtAck: severity,
                conditionPersists,
              },
      },
      nowMs,
    );
    // A escada volta a correr para promessa quebrada (Y1/Y2).
    const ladderLive = status === 'open' || ackGate.decayed;


    // P3 — a âncora governa alertas cuja escada está viva: abertos ou com
    // promessa decaída (Y1). Perfil `row` segue idêntico ao pré-238.
    const streak =
      profile.anchorMode === 'streak' && ladderLive
        ? (streaks.get(row.routine) ?? null)
        : null;

    const conditionAgeMinutes =
      streak === null ? null : Math.max(0, (nowMs - streak.anchorAtMs) / MINUTE_MS);
    // P4 — a idade que alimenta a escada nunca é menor que a da própria linha.
    const ladderAge = conditionAgeMinutes === null ? ageMin : Math.max(conditionAgeMinutes, ageMin);
    const effectiveLevel: EscalationLevel =
      streak === null ? level : ((streak.maxLevel > level ? streak.maxLevel : level) as EscalationLevel);

    return {
      id: row.id,
      routine: row.routine,
      severity,
      reason: row.reason,
      status,
      level,
      levelLabel: ESCALATION_LEVEL_LABELS[level],
      ageMinutes: Math.round(ageMin * 10) / 10,
      // Reconhecer congela a escada (Onda 117) — mas só enquanto a promessa
      // vale (Onda 249). Promessa quebrada volta a ter previsão de degrau.
      minutesToNextLevel: ladderLive
        ? minutesToNextLevelForProfile(
            profile,
            severity,
            effectiveLevel,
            ladderAge,
            lastStepMs === null ? null : Math.max(0, (nowMs - lastStepMs) / MINUTE_MS),
          )
        : null,
      canAcknowledge: status === 'open',
      acknowledgedAtMs,
      routing: readOwnerRouting(row.detail),
      profileId: profile.id,
      profileLabel: profile.label,
      conditionAgeMinutes:
        conditionAgeMinutes === null ? null : Math.round(conditionAgeMinutes * 10) / 10,
      conditionRows: streak?.rows ?? 1,
      effectiveLevel,
      // R8 — reconhecido não exibe silêncio: a expectativa de notificação
      // externa foi encerrada pelo próprio operador.
      silence:
        status === 'open'
          ? buildConditionSilence(row.routine, severity, noticeIndex, nowMs)
          : null,
      ackState: ackGate.state,
      ackLabel: escalationAckLabel(ackGate),
      ackDecayed: ackGate.decayed,
      ackMinutesRemaining: ackGate.minutesRemaining,
    };
  });

  });

  views.sort(compareRows);

  const open = views.filter((view) => view.status === 'open');
  const openCritical = open.filter((view) => view.severity === 'critical').length;
  const atCeiling = open.filter(
    (view) => view.effectiveLevel >= escalationProfileFor(view.routine).maxLevel[view.severity],
  ).length;

  // `thresholds` permanece na assinatura por compatibilidade com chamadores
  // antigos; a régua efetiva é o perfil. Lemos o campo para deixar explícito
  // que a divergência é intencional e não um parâmetro esquecido.
  void thresholds;

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
      slowProfile: open.filter((view) => view.profileId !== 'operational').length,
      silenced: open.filter((view) => (view.silence?.silencedChannels ?? 0) > 0).length,
      silenceBrokenByEscalation: open.filter((view) => view.silence?.breaksOnEscalation === true)
        .length,
    },
  };
}

