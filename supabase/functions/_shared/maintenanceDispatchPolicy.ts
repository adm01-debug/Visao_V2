/**
 * Onda 111 — Política pura de despacho externo dos alertas de manutenção.
 *
 * Regra de ouro: nenhuma decisão de envio pode viver dentro do handler HTTP.
 * O handler apenas lê o banco, chama estas funções puras e executa o que elas
 * mandarem. Assim a mesma lógica é simulável (scripts/simulate-wave111-*.mjs)
 * e testável sem rede, sem Deno e sem banco.
 */

/** Severidades emitidas por `evaluate_maintenance_alerts`. */
export type DispatchSeverity = "warning" | "critical";

/** Canais externos suportados pelo despachante. */
export type DispatchChannel = "telegram" | "email";

/** Alerta persistido em `public.maintenance_alert_events`. */
export interface MaintenanceAlert {
  id: string;
  routine: string;
  severity: DispatchSeverity;
  reason: string;
  created_at: string;
  detail?: Record<string, unknown> | null;
}

/** Tentativa já registrada em `public.maintenance_alert_dispatches`. */
export interface DispatchRecord {
  alert_id: string;
  channel: DispatchChannel;
  status: "sent" | "failed" | "skipped";
  attempts: number;
  /** ISO timestamp da última tentativa. */
  last_attempt_at: string | null;
}

/** Configuração efetiva do despachante (derivada de env + parâmetros). */
export interface DispatchConfig {
  /** Canais habilitados (só entram aqui os que têm credencial configurada). */
  channels: DispatchChannel[];
  /** Severidade mínima despachada. `critical` ignora avisos. */
  minSeverity: DispatchSeverity;
  /** Idade máxima (horas) de um alerta ainda digno de notificação. */
  maxAgeHours: number;
  /** Máximo de tentativas por (alerta, canal) antes de desistir. */
  maxAttempts: number;
  /** Backoff base em minutos — dobra a cada tentativa falha. */
  backoffBaseMinutes: number;
  /** Teto de alertas despachados por execução (protege rate limits). */
  batchLimit: number;
}

/** Motivo pelo qual um alerta não foi despachado nesta execução. */
export type SkipReason =
  | "below_min_severity"
  | "too_old"
  | "already_sent"
  | "max_attempts_reached"
  | "backoff_pending"
  | "batch_limit"
  | "condition_throttled"
  | "channel_disabled";

/** Uma unidade de trabalho: mandar `alert` pelo `channel`. */
export interface DispatchPlanItem {
  alert: MaintenanceAlert;
  channel: DispatchChannel;
  attempt: number;
  dedupKey: string;
  /** Chave da condição (Onda 240) — usada para o silêncio por condição. */
  conditionKey: string;
}

/** Um par (alerta, canal) descartado, com o motivo auditável. */
export interface DispatchSkip {
  alertId: string;
  channel: DispatchChannel;
  reason: SkipReason;
  /** Detalhe auditável do silêncio por condição (minutos restantes). */
  detail?: Record<string, unknown>;
}

/** Resultado do planejamento. */
export interface DispatchPlan {
  items: DispatchPlanItem[];
  skipped: DispatchSkip[];
}

/**
 * Onda 240 — **Silêncio por condição no despacho externo**.
 *
 * ## O defeito
 *
 * A dedup da Onda 111 é por **linha** (`alert_id:canal`). Isso bastava quando
 * toda fonte do barramento era pontual. Desde as Ondas 232/234/236 existem
 * fontes de contabilidade que **reemitem uma linha nova a cada noite** enquanto
 * a condição persiste. Para o despachante, cada noite é um alerta inédito: a
 * mesma condição crônica vira uma notificação externa por dia, indefinidamente.
 * Canal externo que repete todo dia a mesma frase é canal que o operador
 * silencia — e aí o alerta crítico seguinte também morre. Ruído crônico não é
 * excesso de zelo, é destruição de canal.
 *
 * ## As leis Q1–Q10
 *
 *  Q1. A condição é a **chave da rotina** (`admission_trend:ledger_stock`), não
 *      o id da linha. Silêncio é por (condição, canal).
 *  Q2. A janela de silêncio sai do **perfil de escalada** (Onda 238): fonte
 *      operacional tem janela 0 (comportamento pré-240 bit-a-bit idêntico —
 *      não-regressão), fonte de contabilidade herda `minStepMinutes` (1 dia).
 *  Q3. **Agravamento sempre fura o silêncio.** Se a última notificação bem
 *      sucedida foi `warning` e a condição agora é `critical`, notifica já.
 *  Q4. Só **envio bem-sucedido** silencia. Falha de transporte jamais cala uma
 *      condição — senão um Telegram fora do ar viraria silêncio de um dia.
 *  Q5. Silêncio é **por canal**. Telegram entregue não cala o e-mail.
 *  Q6. Relógio inválido ou notificação no futuro **não** silencia (fail-open).
 *  Q7. Primeira notificação de uma condição nunca é silenciada.
 *  Q8. O silêncio é **auditável**: `condition_throttled` carrega os minutos
 *      restantes e a severidade que já foi entregue.
 *  Q9. Dedup por linha (`already_sent`) tem precedência sobre o silêncio: o
 *      motivo mais específico é o que vai para a trilha.
 *  Q10. O silêncio também vale **dentro da mesma execução**: uma rajada de
 *      linhas da mesma condição gera no máximo um envio por canal.
 */

/** Notificação externa já entregue com sucesso para uma condição. */
export interface ConditionNotice {
  conditionKey: string;
  channel: DispatchChannel;
  severity: DispatchSeverity;
  /** ISO timestamp do envio bem-sucedido. */
  sentAt: string | null;
}

/**
 * Espelho do mapa de perfis de `src/lib/escalationProfiles.ts` (Onda 238).
 * Prefixo → janela mínima entre notificações externas da mesma condição.
 * A paridade com o módulo do app é conferida em teste unitário.
 */
export const CONDITION_THROTTLE_PREFIXES: ReadonlyArray<readonly [string, number]> = [
  ["admission_trend:", 1440],
  ["admission_reconcile:", 1440],
  ["admission_backlog:", 1440],
];

/** Q1 — chave da condição de um alerta. */
export function conditionKeyFor(alert: MaintenanceAlert): string {
  return typeof alert.routine === "string" ? alert.routine : "";
}

/** Q2 — janela de silêncio (minutos) da condição. `0` = sem silêncio. */
export function conditionThrottleMinutes(routine: string | null | undefined): number {
  if (typeof routine !== "string" || routine.length === 0) return 0;
  let minutes = 0;
  let bestLength = -1;
  for (const [prefix, value] of CONDITION_THROTTLE_PREFIXES) {
    if (routine.startsWith(prefix) && prefix.length > bestLength) {
      minutes = value;
      bestLength = prefix.length;
    }
  }
  return minutes;
}



export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  channels: [],
  minSeverity: "critical",
  maxAgeHours: 24,
  maxAttempts: 4,
  backoffBaseMinutes: 15,
  batchLimit: 20,
};

const SEVERITY_RANK: Record<DispatchSeverity, number> = { warning: 1, critical: 2 };

/** Rótulos humanos das rotinas noturnas monitoradas. */
const ROUTINE_LABELS: Record<string, string> = {
  partition_maintenance: "Cobertura de partições",
  partition_drain: "Drenagem da partição DEFAULT",
  partition_quarantine: "Triagem da quarentena",
};

/** Nome legível de uma rotina (cai no identificador cru quando desconhecida). */
export function routineLabel(routine: string): string {
  return ROUTINE_LABELS[routine] ?? routine;
}

/**
 * Chave de deduplicação estável: um alerta só é notificado uma vez por canal,
 * mesmo que a execução do despachante se repita ou rode em paralelo.
 */
export function dedupKeyFor(alert: MaintenanceAlert, channel: DispatchChannel): string {
  return `${alert.id}:${channel}`;
}

/** Janela de espera (ms) antes da próxima tentativa após `attempts` falhas. */
export function backoffMs(attempts: number, baseMinutes: number): number {
  const safeAttempts = Math.max(0, Math.min(attempts, 10));
  return baseMinutes * 60_000 * 2 ** Math.max(0, safeAttempts - 1);
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Constrói o plano de despacho.
 *
 * Invariantes garantidas (validadas na simulação da Onda 111):
 *  I1 — nunca reenvia um par (alerta, canal) já com status `sent`;
 *  I2 — nunca excede `maxAttempts` por par;
 *  I3 — respeita backoff exponencial após falhas;
 *  I4 — nunca despacha alerta abaixo de `minSeverity` nem mais velho que `maxAgeHours`;
 *  I5 — nunca ultrapassa `batchLimit` itens;
 *  I6 — cada par aparece no máximo uma vez, seja em `items` ou em `skipped`.
 */
export function planDispatch(
  alerts: MaintenanceAlert[],
  dispatches: DispatchRecord[],
  config: DispatchConfig,
  nowMs: number,
): DispatchPlan {
  const items: DispatchPlanItem[] = [];
  const skipped: DispatchSkip[] = [];

  const byPair = new Map<string, DispatchRecord>();
  for (const d of dispatches) {
    const key = `${d.alert_id}:${d.channel}`;
    const prev = byPair.get(key);
    // Mantém o registro mais informativo: `sent` vence, depois o de mais tentativas.
    if (
      !prev ||
      (d.status === "sent" && prev.status !== "sent") ||
      (prev.status !== "sent" && d.attempts > prev.attempts)
    ) {
      byPair.set(key, d);
    }
  }

  // Mais crítico e mais recente primeiro — se o lote saturar, o que importa sai.
  const ordered = [...alerts].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (bySeverity !== 0) return bySeverity;
    return (parseTime(b.created_at) ?? 0) - (parseTime(a.created_at) ?? 0);
  });

  const seen = new Set<string>();

  for (const alert of ordered) {
    for (const channel of config.channels) {
      const pairKey = `${alert.id}:${channel}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      if (SEVERITY_RANK[alert.severity] < SEVERITY_RANK[config.minSeverity]) {
        skipped.push({ alertId: alert.id, channel, reason: "below_min_severity" });
        continue;
      }

      const createdAt = parseTime(alert.created_at);
      const ageHours = createdAt === null ? Number.POSITIVE_INFINITY : (nowMs - createdAt) / 3_600_000;
      if (ageHours > config.maxAgeHours) {
        skipped.push({ alertId: alert.id, channel, reason: "too_old" });
        continue;
      }

      const record = byPair.get(pairKey);
      if (record?.status === "sent") {
        skipped.push({ alertId: alert.id, channel, reason: "already_sent" });
        continue;
      }

      const attempts = record?.attempts ?? 0;
      if (attempts >= config.maxAttempts) {
        skipped.push({ alertId: alert.id, channel, reason: "max_attempts_reached" });
        continue;
      }

      if (attempts > 0) {
        const last = parseTime(record?.last_attempt_at ?? null);
        if (last !== null && nowMs - last < backoffMs(attempts, config.backoffBaseMinutes)) {
          skipped.push({ alertId: alert.id, channel, reason: "backoff_pending" });
          continue;
        }
      }

      if (items.length >= config.batchLimit) {
        skipped.push({ alertId: alert.id, channel, reason: "batch_limit" });
        continue;
      }

      items.push({ alert, channel, attempt: attempts + 1, dedupKey: dedupKeyFor(alert, channel) });
    }
  }

  return { items, skipped };
}

/** Corpo da notificação, já formatado por canal. */
export interface RenderedMessage {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Renderiza a mensagem de um alerta (sem vazar credenciais ou IDs internos sensíveis). */
export function renderMessage(alert: MaintenanceAlert): RenderedMessage {
  const icon = alert.severity === "critical" ? "🚨" : "⚠️";
  const label = routineLabel(alert.routine);
  const severityLabel = alert.severity === "critical" ? "CRÍTICO" : "ATENÇÃO";
  const when = new Date(alert.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const subject = `${icon} VISÃO — ${severityLabel}: ${label}`;
  const text =
    `${icon} VISÃO — Manutenção do banco\n\n` +
    `Rotina: ${label}\n` +
    `Severidade: ${severityLabel}\n` +
    `Motivo: ${alert.reason}\n` +
    `Detectado em: ${when}`;
  const html =
    `${icon} <b>VISÃO — Manutenção do banco</b>\n\n` +
    `Rotina: <b>${escapeHtml(label)}</b>\n` +
    `Severidade: <b>${severityLabel}</b>\n` +
    `Motivo: ${escapeHtml(alert.reason)}\n` +
    `Detectado em: <code>${escapeHtml(when)}</code>`;

  return { subject, text, html };
}

/** Resolve a configuração efetiva a partir do ambiente e do corpo da requisição. */
export function resolveConfig(
  env: Record<string, string | undefined>,
  overrides: Partial<DispatchConfig> = {},
): DispatchConfig {
  const channels: DispatchChannel[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) channels.push("telegram");
  if (env.RESEND_API_KEY && env.MAINTENANCE_ALERT_EMAIL) channels.push("email");

  const requested = overrides.channels;
  const effective = requested ? channels.filter((c) => requested.includes(c)) : channels;

  return {
    ...DEFAULT_DISPATCH_CONFIG,
    ...overrides,
    channels: effective,
  };
}
