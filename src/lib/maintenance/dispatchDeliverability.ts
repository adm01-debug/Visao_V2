/**
 * Onda 246 — **Prova de entrega do despachante externo**.
 *
 * ## O defeito que originou esta régua
 *
 * A auditoria de 29/07 encontrou o pior tipo de falha que um sistema de alerta
 * pode ter: `maintenance_alert_dispatches` estava **vazia desde a Onda 111**.
 * Zero linhas. Nenhuma notificação externa jamais saiu deste sistema.
 *
 * A causa era banal — nenhum canal configurado (`no_channels_configured` no
 * log da edge function) — mas o **dano** não era: o console mostrava alertas
 * críticos subindo a escada de escalonamento até o nível 3 ("paged"), com a
 * frase "sem reconhecimento há 370 min", como se alguém tivesse sido chamado.
 * Ninguém foi. A escada media apenas a passagem do tempo e chamava isso de
 * escalada. Um painel que diz "avisamos e escalamos" enquanto o mundo externo
 * está em silêncio absoluto é pior que painel nenhum: ele **produz confiança
 * falsa**, que é exatamente o que um plantão não pode ter.
 *
 * Pior ainda, o único lugar onde a verdade existia era um log de execução da
 * edge function, com retenção curta e invisível ao operador. A ausência de
 * linhas em `maintenance_alert_dispatches` é ambígua por construção: pode
 * significar "nada precisava ser enviado", "tudo foi silenciado por condição"
 * ou "o despachante está mudo há oito meses". Ambiguidade em prova de entrega
 * é o mesmo que ausência de prova.
 *
 * ## A tese
 *
 * Entrega não se infere da ausência de erro; entrega se **prova**. Esta régua
 * lê o livro de execuções do despachante (`maintenance_dispatch_runs`, criado
 * nesta onda) e emite um veredito honesto, separando dois eixos que a intuição
 * insiste em fundir:
 *
 *  - **pontualidade** — o despachante *rodou*?
 *  - **entrega** — quando rodou, alguma coisa *saiu*?
 *
 * Um despachante pontual e mudo é mais perigoso que um atrasado que entrega,
 * porque só o primeiro parece saudável.
 *
 * ## As leis V1–V10
 *
 *  V1. **Ausência de registro nunca é saúde.** Sem execução legível o veredito
 *      é `unknown`, jamais `ok`. "Não sei" e "está tudo bem" são estados
 *      diferentes e o painel precisa dizer qual dos dois é.
 *  V2. **Executar sem canal é mudez, não ociosidade.** Um despachante sem
 *      canal configurado é um pager desligado: no mínimo `warning`. Com
 *      crítico aberto na fila, é `critical` — havia o que dizer e não se disse.
 *  V3. **Planejado nunca é entregue.** Só `sent` conta como prova. Falha de
 *      transporte é fracasso declarado, nunca sucesso silencioso.
 *  V4. **Silenciado não é falha nem entrega.** O throttle por condição
 *      (Onda 240) é decisão deliberada; poluir o veredito com ele faria o
 *      anti-ruído parecer avaria.
 *  V5. **Pontualidade e entrega são eixos independentes** e ambos são
 *      publicados. Fundi-los num número esconde justamente o caso perigoso.
 *  V6. **O pior eixo governa** a saúde final. Nenhuma média, nenhuma maioria.
 *  V7. **Execução no futuro não conta.** Relógio adiantado não compra frescor;
 *      a linha é descartada e a busca continua na anterior (fail-safe).
 *  V8. **Contabilidade fechada.** `candidates` precisa bater com
 *      `planned + skipped`. Livro que não fecha é `unreadable` — declarado,
 *      nunca arredondado para um veredito bonito.
 *  V9. **Ensaio não é execução.** `dry_run` jamais entra no livro, senão um
 *      teste de QA passaria por prova de entrega.
 *  V10. **Crítico não notificado é o número que importa.** É ele que traduz o
 *      defeito para a linguagem do plantão, e ele nunca é negativo nem
 *      inventado quando a contagem é ilegível.
 */

/** Linha crua de `public.maintenance_dispatch_runs`. */
export interface DispatchRunRow {
  ran_at: string | null;
  channels: string[] | null;
  candidates: number | null;
  planned: number | null;
  sent: number | null;
  failed: number | null;
  skipped: number | null;
  throttled: number | null;
  outcome: string | null;
}

/** Eixo "o despachante rodou?". */
export type DispatchPunctuality = 'fresh' | 'late' | 'stalled' | 'unknown';

/** Eixo "quando rodou, saiu alguma coisa?". */
export type DispatchDelivery =
  | 'delivering'
  | 'degraded'
  | 'failing'
  | 'muted'
  | 'idle'
  | 'unreadable'
  | 'unknown';

/** Saúde publicada — `unknown` fica logo abaixo de `critical` na ordem. */
export type DeliverabilityHealth = 'ok' | 'warning' | 'unknown' | 'critical';

export interface DeliverabilityVerdict {
  punctuality: DispatchPunctuality;
  delivery: DispatchDelivery;
  health: DeliverabilityHealth;
  /** Minutos desde a última execução legível; `null` quando não há nenhuma. */
  minutesSinceRun: number | null;
  /** ISO da execução considerada; `null` quando nenhuma é legível. */
  lastRunAt: string | null;
  /** Canais configurados na última execução legível. */
  channels: string[];
  /** Críticos abertos que nenhuma execução conseguiu notificar. */
  unnotifiedCritical: number;
  /** Motivos legíveis, em ordem de descoberta. */
  reasons: string[];
}

/** Cadência declarada do cron `maintenance-alerts-dispatch-hourly`. */
export const DISPATCH_CADENCE_MINUTES = 60;

/** Folga de agendamento antes de considerar a execução atrasada. */
const GRACE_MINUTES = 15;

const MS_PER_MINUTE = 60_000;

const HEALTH_ORDER: Record<DeliverabilityHealth, number> = {
  ok: 0,
  warning: 1,
  unknown: 2,
  critical: 3,
};

/** V6 — o pior eixo governa. */
function worst(a: DeliverabilityHealth, b: DeliverabilityHealth): DeliverabilityHealth {
  return HEALTH_ORDER[a] >= HEALTH_ORDER[b] ? a : b;
}

function parseInstant(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Contagem não-negativa e finita, ou `null` quando ilegível. */
function count(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.trunc(value);
}

function normalizeChannels(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const channel = raw.trim();
    if (channel !== '') seen.add(channel);
  }
  return [...seen].sort();
}

function punctualityOf(minutes: number, cadenceMinutes: number): DispatchPunctuality {
  if (minutes <= cadenceMinutes + GRACE_MINUTES) return 'fresh';
  if (minutes <= cadenceMinutes * 2 + GRACE_MINUTES) return 'late';
  return 'stalled';
}

const PUNCTUALITY_HEALTH: Record<DispatchPunctuality, DeliverabilityHealth> = {
  fresh: 'ok',
  late: 'warning',
  stalled: 'critical',
  unknown: 'unknown',
};

/**
 * Emite o veredito de entregabilidade.
 *
 * @param runs Execuções recentes, em qualquer ordem (a mais recente legível
 *   vence). Linhas com relógio ilegível ou no futuro são descartadas (V7).
 * @param openCritical Críticos abertos e não reconhecidos no momento da
 *   leitura. `null` quando a contagem não pôde ser lida — nunca vira zero.
 */
export function assessDeliverability(
  runs: readonly DispatchRunRow[],
  openCritical: number | null,
  nowMs: number,
  cadenceMinutes: number = DISPATCH_CADENCE_MINUTES,
): DeliverabilityVerdict {
  const reasons: string[] = [];
  const criticalOpen = count(openCritical);

  // V7 — só executa quem tem carimbo legível e não está no futuro.
  const readable = runs
    .map((row) => ({ row, ms: parseInstant(row.ran_at) }))
    .filter((entry): entry is { row: DispatchRunRow; ms: number } => entry.ms !== null);
  const futureCount = readable.filter((entry) => entry.ms > nowMs).length;
  if (futureCount > 0) reasons.push(`${futureCount} execução(ões) com relógio no futuro ignorada(s)`);

  const usable = readable.filter((entry) => entry.ms <= nowMs).sort((a, b) => b.ms - a.ms);

  if (usable.length === 0) {
    // V1 — sem prova de execução não existe saúde, existe ignorância.
    reasons.push('nenhuma execução registrada do despachante');
    return {
      punctuality: 'unknown',
      delivery: 'unknown',
      health: 'unknown',
      minutesSinceRun: null,
      lastRunAt: null,
      channels: [],
      unnotifiedCritical: criticalOpen ?? 0,
      reasons,
    };
  }

  const latest = usable[0];
  if (latest === undefined) throw new Error('unreachable: usable non-empty');
  const minutesSinceRun = (nowMs - latest.ms) / MS_PER_MINUTE;

  const punctuality = punctualityOf(minutesSinceRun, cadenceMinutes);
  if (punctuality === 'late') reasons.push('despachante atrasado em relação à cadência');
  if (punctuality === 'stalled') reasons.push('despachante parado além do dobro da cadência');

  const channels = normalizeChannels(latest.row.channels);
  const candidates = count(latest.row.candidates);
  const planned = count(latest.row.planned);
  const sent = count(latest.row.sent);
  const failed = count(latest.row.failed);
  const skipped = count(latest.row.skipped);

  let delivery: DispatchDelivery;
  let deliveryHealth: DeliverabilityHealth;

  if (planned === null || sent === null || failed === null) {
    // V8 — número ilegível é declarado, não estimado.
    delivery = 'unreadable';
    deliveryHealth = 'unknown';
    reasons.push('contagens da última execução ilegíveis');
  } else if (candidates !== null && skipped !== null && candidates !== planned + skipped) {
    delivery = 'unreadable';
    deliveryHealth = 'unknown';
    reasons.push(
      `contabilidade não fecha: ${candidates} candidato(s) ≠ ${planned} planejado(s) + ${skipped} descartado(s)`,
    );
  } else if (channels.length === 0) {
    // V2 — pager desligado. Ociosidade não absolve, apenas atenua.
    delivery = 'muted';
    deliveryHealth = (criticalOpen ?? 0) > 0 ? 'critical' : 'warning';
    reasons.push(
      (criticalOpen ?? 0) > 0
        ? `nenhum canal configurado com ${criticalOpen} crítico(s) aberto(s) — ninguém foi avisado`
        : 'nenhum canal externo configurado — o despachante está mudo',
    );
  } else if (planned === 0) {
    // V4 — silenciar por condição é decisão, não avaria.
    delivery = 'idle';
    deliveryHealth = 'ok';
  } else if (sent > 0 && failed === 0) {
    delivery = 'delivering';
    deliveryHealth = 'ok';
  } else if (sent > 0) {
    delivery = 'degraded';
    deliveryHealth = 'warning';
    reasons.push(`${failed} envio(s) falharam na última execução`);
  } else {
    // V3 — planejar não é entregar.
    delivery = 'failing';
    deliveryHealth = 'critical';
    reasons.push(`nenhum dos ${planned} envio(s) planejados saiu`);
  }

  // V10 — o número que o plantão entende.
  const unnotifiedCritical =
    criticalOpen === null
      ? 0
      : delivery === 'muted' || delivery === 'failing'
        ? criticalOpen
        : 0;
  if (criticalOpen === null) reasons.push('contagem de críticos abertos ilegível');

  return {
    punctuality,
    delivery,
    health: worst(PUNCTUALITY_HEALTH[punctuality], deliveryHealth),
    minutesSinceRun,
    lastRunAt: new Date(latest.ms).toISOString(),
    channels,
    unnotifiedCritical,
    reasons,
  };
}

const DELIVERY_LABEL: Record<DispatchDelivery, string> = {
  delivering: 'entregando',
  degraded: 'entrega degradada',
  failing: 'nenhuma entrega saiu',
  muted: 'despachante mudo',
  idle: 'sem nada a enviar',
  unreadable: 'execução ilegível',
  unknown: 'sem registro de execução',
};

const PUNCTUALITY_LABEL: Record<DispatchPunctuality, string> = {
  fresh: 'em dia',
  late: 'atrasado',
  stalled: 'parado',
  unknown: 'sem execução',
};

export function deliveryLabel(delivery: DispatchDelivery): string {
  return DELIVERY_LABEL[delivery];
}

export function punctualityLabel(punctuality: DispatchPunctuality): string {
  return PUNCTUALITY_LABEL[punctuality];
}
