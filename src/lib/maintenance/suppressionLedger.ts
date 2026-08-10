/**
 * Onda 242 — **Trilha do ruído evitado** (leis S1–S10).
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 240 passou a calar o despacho externo por condição e a Onda 241 tornou
 * esse silêncio visível no console. Mas o silêncio continuava **sem memória**:
 * o motivo `condition_throttled` nascia dentro do plano de despacho, era
 * contado no log da execução e morria ali. Consequências práticas:
 *
 *  - não há como responder "quantas mensagens deixamos de mandar por causa da
 *    política?" — ou seja, não há como provar que o anti-ruído vale o risco;
 *  - pior: não há como detectar o **caso patológico** em que uma condição só
 *    acumula supressão e nunca chegou a notificar ninguém. Do lado de fora,
 *    "calado porque já avisei" e "calado por engano" são idênticos.
 *
 * Esta régua lê a trilha persistida e produz um retrato auditável. Ela é pura:
 * o mesmo código roda na simulação, no teste e na tela.
 *
 * ## As leis
 *
 *  S1. A unidade é o par **(condição, canal)** num instante. Nunca uma
 *      contagem agregada crua vinda do banco — agregado não é auditável.
 *  S2. Linha **ilegível** (sem condição, canal desconhecido, instante
 *      inválido, janela negativa) nunca vira "ruído evitado". Vai para um eixo
 *      próprio (`unreadable`), porque contar lixo como economia é mentir a
 *      favor da própria política.
 *  S3. Supressão **fora da janela** declarada é descartada: a leitura nunca
 *      extrapola o período que se propôs a medir.
 *  S4. Supressão no **futuro** é ilegível (relógio quebrado), não economia.
 *  S5. **Zero linhas nunca é "calmo".** Sem histórico o veredito é
 *      `no_history` — ausência de dado não é prova de silêncio saudável.
 *  S6. Condição com supressões e **nenhuma entrega** na janela é `starved`:
 *      foi calada sem nunca ter falado. É o pior veredito, acima de volume.
 *  S7. **A pior condição governa** o veredito geral — nunca a média. Uma
 *      condição sufocada no meio de vinte saudáveis mantém o painel vermelho.
 *  S8. Volume é medido por **taxa diária por condição**, não por total
 *      absoluto: janela de 7 dias e de 1 dia não podem produzir o mesmo
 *      rótulo com o mesmo número.
 *  S9. Contagens saturam num teto declarado e a **saturação é visível**
 *      (`saturated`), para que "1000+" nunca seja lido como "exatamente 1000".
 * S10. A ordem das condições é **estável e determinística**: mais supressões
 *      primeiro, empate resolvido pela chave em ordem alfabética.
 */

/** Canais externos que a política de despacho conhece. */
export const SUPPRESSION_CHANNELS = ['telegram', 'email'] as const;
export type SuppressionChannel = (typeof SUPPRESSION_CHANNELS)[number];

/** Teto declarado de linhas consideradas numa leitura (S9). */
export const SUPPRESSION_ROW_CAP = 2000;

/** Linha crua da trilha `public.maintenance_dispatch_suppressions`. */
export interface SuppressionRow {
  readonly conditionKey: unknown;
  readonly channel: unknown;
  readonly severity?: unknown;
  readonly windowMinutes?: unknown;
  readonly suppressedAt: unknown;
}

/** Entrega bem-sucedida conhecida para uma condição (Onda 241 reaproveitada). */
export interface DeliveryRow {
  readonly conditionKey: unknown;
  readonly channel: unknown;
  readonly sentAt: unknown;
}

export type ConditionVerdict = 'light' | 'moderate' | 'heavy' | 'starved';
export type LedgerVerdict = 'no_history' | ConditionVerdict;

export interface ConditionSuppression {
  readonly conditionKey: string;
  /** Supressões legíveis dentro da janela. */
  readonly suppressed: number;
  /** Entregas bem-sucedidas da mesma condição na mesma janela. */
  readonly delivered: number;
  /** Supressões por dia (S8). */
  readonly perDay: number;
  readonly channels: readonly SuppressionChannel[];
  readonly firstAt: number;
  readonly lastAt: number;
  readonly verdict: ConditionVerdict;
}

export interface SuppressionLedger {
  readonly verdict: LedgerVerdict;
  readonly windowHours: number;
  /** Total de supressões legíveis na janela — o "ruído evitado". */
  readonly suppressed: number;
  /** Total de entregas na janela, para dar escala ao número acima. */
  readonly delivered: number;
  /** Linhas descartadas por ilegibilidade (S2/S4). */
  readonly unreadable: number;
  /** Linhas descartadas por estarem fora da janela (S3). */
  readonly outOfWindow: number;
  /** `true` quando o teto de linhas foi atingido (S9). */
  readonly saturated: boolean;
  readonly conditions: readonly ConditionSuppression[];
  /** Condições caladas sem nunca terem notificado (S6). */
  readonly starved: readonly string[];
}

const EMPTY: SuppressionLedger = {
  verdict: 'no_history',
  windowHours: 0,
  suppressed: 0,
  delivered: 0,
  unreadable: 0,
  outOfWindow: 0,
  saturated: false,
  conditions: [],
  starved: [],
};

function parseInstant(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function parseChannel(value: unknown): SuppressionChannel | null {
  return typeof value === 'string' && (SUPPRESSION_CHANNELS as readonly string[]).includes(value)
    ? (value as SuppressionChannel)
    : null;
}

function parseCondition(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** S8 — rótulo de volume a partir da taxa diária. */
export function classifyPerDay(perDay: number): Exclude<ConditionVerdict, 'starved'> {
  if (!Number.isFinite(perDay) || perDay <= 0) return 'light';
  if (perDay > 5) return 'heavy';
  if (perDay >= 1) return 'moderate';
  return 'light';
}

const VERDICT_RANK: Record<LedgerVerdict, number> = {
  no_history: 0,
  light: 1,
  moderate: 2,
  heavy: 3,
  starved: 4,
};

/** Severidade de manutenção correspondente ao veredito. */
export function severityForLedger(verdict: LedgerVerdict): 'ok' | 'warning' | 'critical' {
  if (verdict === 'starved') return 'critical';
  if (verdict === 'heavy') return 'warning';
  return 'ok';
}

/** Texto humano do veredito, para tela e para log. */
export function renderLedgerVerdict(ledger: SuppressionLedger): string {
  switch (ledger.verdict) {
    case 'no_history':
      return 'Sem registro de supressão na janela — nada a concluir sobre ruído evitado.';
    case 'starved':
      return `${ledger.starved.length} condição(ões) foram caladas sem nenhuma notificação entregue na janela.`;
    case 'heavy':
      return 'Há condição crônica suprimida em volume alto — o anti-ruído está segurando repetição diária.';
    case 'moderate':
      return 'Supressão em volume esperado para fontes de contabilidade diária.';
    case 'light':
      return 'Supressão pontual — o canal externo está praticamente sem repetição.';
  }
}

/**
 * Constrói o retrato da trilha.
 *
 * @param rows      linhas da trilha de supressão
 * @param deliveries entregas bem-sucedidas conhecidas na mesma janela
 * @param nowMs     relógio de referência
 * @param windowHours janela declarada da leitura (horas)
 */
export function buildSuppressionLedger(
  rows: readonly SuppressionRow[],
  deliveries: readonly DeliveryRow[],
  nowMs: number,
  windowHours: number
): SuppressionLedger {
  const safeWindow =
    Number.isFinite(windowHours) && windowHours > 0 ? Math.min(windowHours, 24 * 365) : 0;
  if (safeWindow === 0) return EMPTY;
  if (!Number.isFinite(nowMs)) return { ...EMPTY, windowHours: safeWindow };

  const floor = nowMs - safeWindow * 3_600_000;

  interface Acc {
    suppressed: number;
    delivered: number;
    channels: Set<SuppressionChannel>;
    firstAt: number;
    lastAt: number;
  }
  const byCondition = new Map<string, Acc>();
  const touch = (key: string): Acc => {
    let acc = byCondition.get(key);
    if (!acc) {
      acc = {
        suppressed: 0,
        delivered: 0,
        channels: new Set(),
        firstAt: Number.POSITIVE_INFINITY,
        lastAt: Number.NEGATIVE_INFINITY,
      };
      byCondition.set(key, acc);
    }
    return acc;
  };

  let unreadable = 0;
  let outOfWindow = 0;
  let suppressed = 0;

  const considered = rows.slice(0, SUPPRESSION_ROW_CAP);
  const saturated = rows.length > SUPPRESSION_ROW_CAP;

  for (const row of considered) {
    const key = parseCondition(row.conditionKey);
    const channel = parseChannel(row.channel);
    const at = parseInstant(row.suppressedAt);
    const window = row.windowMinutes;
    const windowOk =
      window === undefined ||
      window === null ||
      (typeof window === 'number' && Number.isFinite(window) && window >= 0);

    // S2/S4 — ilegível e relógio futuro nunca contam como economia.
    if (key === null || channel === null || at === null || at > nowMs || !windowOk) {
      unreadable += 1;
      continue;
    }
    // S3 — fora da janela declarada não entra na conta.
    if (at < floor) {
      outOfWindow += 1;
      continue;
    }

    const acc = touch(key);
    acc.suppressed += 1;
    acc.channels.add(channel);
    acc.firstAt = Math.min(acc.firstAt, at);
    acc.lastAt = Math.max(acc.lastAt, at);
    suppressed += 1;
  }

  let delivered = 0;
  for (const row of deliveries) {
    const key = parseCondition(row.conditionKey);
    const channel = parseChannel(row.channel);
    const at = parseInstant(row.sentAt);
    if (key === null || channel === null || at === null || at > nowMs || at < floor) continue;
    // Entrega de condição sem supressão também conta no total, para dar escala.
    touch(key).delivered += 1;
    delivered += 1;
  }

  const conditions: ConditionSuppression[] = [];
  const starved: string[] = [];
  const days = safeWindow / 24;

  for (const [conditionKey, acc] of byCondition) {
    if (acc.suppressed === 0) continue; // condição só com entrega não é linha da trilha
    const perDay = days > 0 ? acc.suppressed / days : acc.suppressed;
    // S6 — calada sem nunca ter falado é o pior caso, independentemente do volume.
    const verdict: ConditionVerdict = acc.delivered === 0 ? 'starved' : classifyPerDay(perDay);
    if (verdict === 'starved') starved.push(conditionKey);
    conditions.push({
      conditionKey,
      suppressed: acc.suppressed,
      delivered: acc.delivered,
      perDay: Math.round(perDay * 100) / 100,
      channels: [...acc.channels].sort(),
      firstAt: acc.firstAt,
      lastAt: acc.lastAt,
      verdict,
    });
  }

  // S10 — ordem estável.
  conditions.sort(
    (a, b) => b.suppressed - a.suppressed || a.conditionKey.localeCompare(b.conditionKey)
  );
  starved.sort();

  // S5/S7 — sem linha legível não há veredito de calmaria; o pior governa.
  let verdict: LedgerVerdict = 'no_history';
  for (const condition of conditions) {
    if (VERDICT_RANK[condition.verdict] > VERDICT_RANK[verdict]) verdict = condition.verdict;
  }

  return {
    verdict,
    windowHours: safeWindow,
    suppressed,
    delivered,
    unreadable,
    outOfWindow,
    saturated,
    conditions,
    starved,
  };
}
