/**
 * Onda 175 — desempenho do turno (o prazo vira prestação de contas).
 *
 * A Onda 174 mede o prazo de UMA pendência. Esta onda responde a pergunta do
 * turno: "quanto tempo esta mesa levou para reconhecer o que apareceu, e o que
 * está vencido agora?". É a ponte entre o SLA (fato por câmera) e a passagem de
 * turno (relato para quem entra).
 *
 * Regras (cada uma existe porque a alternativa produz um número injusto):
 *
 *  1. **MTTA só de atendimento concluído.** A média de tempo até a ciência usa
 *     exclusivamente vereditos congelados (`met`/`late`). Incluir pendência
 *     aberta transformaria "ainda não atendi" numa média que melhora sozinha
 *     quando o operador ignora o alarme.
 *  2. **Atribuição pelo instante da ciência, não pela abertura.** Ciência dada
 *     dentro da janela do turno conta para este turno, mesmo que a pendência
 *     seja herdada. Ciência anterior ao início do turno pertence a quem a deu.
 *     O contrário premiaria quem entra numa mesa limpa e puniria quem herda.
 *  3. **Dívida herdada é reportada à parte.** Vencido cuja janela abriu antes
 *     do turno entra em `inheritedBreached`, nunca somado ao vencido do turno.
 *     Culpa sem separação é fábula.
 *  4. **Sem amostra não existe nota.** `mttaMs` e `compliance` são `null`
 *     quando não houve atendimento concluído. Nunca 0 ms, nunca 100%.
 *  5. **Relógio para trás nunca vira desempenho.** Duração negativa é
 *     descartada da amostra (não vira zero), pelo mesmo motivo da Onda 174:
 *     drift de NTP não é mérito nem falta.
 *  6. **Puro, determinístico e imutável.** Sem `Date.now()`, sem rede, sem DOM.
 *     Mesma entrada, mesmo relatório, byte a byte.
 */

import { formatAge, type AttentionEntry, type AttentionLedger } from './attentionClock';
import type { AckLedger, AckRecord } from './triageAck';
import {
  DEFAULT_SLA_POLICY,
  evaluateSla,
  slaStateLabel,
  type SlaPolicy,
  type SlaState,
  type SlaVerdict,
} from './triageSla';
import type { MapMarkerStatus } from './floorPlanGeometry';

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Uma pendência com veredito de prazo, situada no turno. */
export interface ShiftSlaItem {
  cameraId: string;
  verdict: SlaVerdict;
  /** Janela de atenção começou antes do início do turno (regra 3). */
  inherited: boolean;
  /** Ciência ocorreu dentro da janela do turno (regra 2). */
  attributedToShift: boolean;
  /** Tempo até a ciência, quando concluído e mensurável (regra 1 e 5). */
  timeToAckMs: number | null;
}

export interface ShiftPerformance {
  startedAt: number;
  endedAt: number;
  /** Todos os itens avaliados, ordenados por urgência e depois por câmera. */
  items: readonly ShiftSlaItem[];
  /** Vereditos concluídos atribuídos a este turno (regra 2). */
  decided: number;
  met: number;
  late: number;
  /** Conformidade do turno: `met / decided`. `null` sem amostra (regra 4). */
  compliance: number | null;
  /** Tempo médio até a ciência no turno. `null` sem amostra (regra 4). */
  mttaMs: number | null;
  /** Pior tempo até a ciência no turno. `null` sem amostra. */
  worstAckMs: number | null;
  /** Vencidos em aberto cuja janela nasceu dentro do turno. */
  breachedInShift: number;
  /** Vencidos em aberto herdados do turno anterior (regra 3). */
  inheritedBreached: number;
  /** Em aberto, prestes a vencer. */
  dueSoon: number;
  /** Maior atraso em aberto, em ms (0 quando não há vencido). */
  worstOverdueMs: number;
  worstOverdueCameraId: string | null;
  byState: Readonly<Record<SlaState, number>>;
}

export interface ShiftPerformanceInput {
  ledger: AttentionLedger;
  acks?: AckLedger | null;
  /** Início do turno — fronteira de atribuição (regra 2). */
  startedAt: number;
  now: number;
  policy?: SlaPolicy;
}

const emptyByState = (): Record<SlaState, number> => ({
  not_applicable: 0,
  on_time: 0,
  due_soon: 0,
  breached: 0,
  met: 0,
  late: 0,
});

/** Ciência só vale para a janela que reconheceu (mesma lei da Onda 172/174). */
const ackForEntry = (
  entry: AttentionEntry,
  ack: AckRecord | undefined | null
): AckRecord | null => {
  if (!ack || typeof ack !== 'object') return null;
  if (ack.cameraId !== entry.cameraId) return null;
  if (!isClock(ack.at) || !isClock(ack.openedAt)) return null;
  if (ack.openedAt !== entry.openedAt) return null;
  return ack;
};

const STATE_URGENCY: Record<SlaState, number> = {
  breached: 0,
  due_soon: 1,
  on_time: 2,
  late: 3,
  met: 4,
  not_applicable: 5,
};

/**
 * Consolida o desempenho de atendimento do turno.
 *
 * Nunca lança: entrada inconsistente é ignorada em vez de virar um número
 * inventado sobre o trabalho de alguém.
 */
export function buildShiftPerformance(input: ShiftPerformanceInput): ShiftPerformance {
  const ledger = input?.ledger && typeof input.ledger === 'object' ? input.ledger : {};
  const acks = input?.acks && typeof input.acks === 'object' ? input.acks : {};
  const now = isClock(input?.now) ? input.now : 0;
  const startedAt = isClock(input?.startedAt) ? input.startedAt : now;
  const policy = input?.policy ?? DEFAULT_SLA_POLICY;

  const items: ShiftSlaItem[] = [];
  const byState = emptyByState();

  let met = 0;
  let late = 0;
  let ackSum = 0;
  let ackCount = 0;
  let worstAckMs: number | null = null;
  let breachedInShift = 0;
  let inheritedBreached = 0;
  let dueSoon = 0;
  let worstOverdueMs = 0;
  let worstOverdueCameraId: string | null = null;

  for (const entry of Object.values(ledger)) {
    if (!entry || typeof entry !== 'object' || typeof entry.cameraId !== 'string') continue;
    if (!isClock(entry.openedAt)) continue;

    const ack = ackForEntry(entry, acks[entry.cameraId]);
    const verdict = evaluateSla({ entry, now, ack, policy });
    byState[verdict.state] += 1;

    const inherited = entry.openedAt < startedAt;
    const frozenAt = verdict.frozen && isClock(verdict.frozenAt) ? verdict.frozenAt : null;
    // Regra 2: a ciência é do turno em que foi dada, não do turno da abertura.
    const attributedToShift = frozenAt != null && frozenAt >= startedAt && frozenAt <= now;

    // Regra 1 + 5: só concluído, só duração positiva e finita.
    let timeToAckMs: number | null = null;
    if (frozenAt != null) {
      const delta = frozenAt - entry.openedAt;
      if (Number.isFinite(delta) && delta >= 0) timeToAckMs = delta;
    }

    if (attributedToShift) {
      if (verdict.state === 'met') met += 1;
      else if (verdict.state === 'late') late += 1;
      if (timeToAckMs != null) {
        ackSum += timeToAckMs;
        ackCount += 1;
        if (worstAckMs == null || timeToAckMs > worstAckMs) worstAckMs = timeToAckMs;
      }
    }

    if (verdict.state === 'breached') {
      if (inherited) inheritedBreached += 1;
      else breachedInShift += 1;
      const overdue = isClock(verdict.overdueMs) ? verdict.overdueMs : 0;
      if (
        overdue > worstOverdueMs ||
        (overdue === worstOverdueMs &&
          overdue > 0 &&
          (worstOverdueCameraId == null || entry.cameraId < worstOverdueCameraId))
      ) {
        worstOverdueMs = overdue;
        worstOverdueCameraId = entry.cameraId;
      }
    } else if (verdict.state === 'due_soon') {
      dueSoon += 1;
    }

    items.push({ cameraId: entry.cameraId, verdict, inherited, attributedToShift, timeToAckMs });
  }

  items.sort((a, b) => {
    const byUrgency = STATE_URGENCY[a.verdict.state] - STATE_URGENCY[b.verdict.state];
    if (byUrgency !== 0) return byUrgency;
    if (b.verdict.overdueMs !== a.verdict.overdueMs)
      return b.verdict.overdueMs - a.verdict.overdueMs;
    return a.cameraId < b.cameraId ? -1 : a.cameraId > b.cameraId ? 1 : 0;
  });

  const decided = met + late;
  return {
    startedAt,
    endedAt: now,
    items,
    decided,
    met,
    late,
    // Regra 4: sem amostra, sem nota.
    compliance: decided > 0 ? met / decided : null,
    mttaMs: ackCount > 0 ? ackSum / ackCount : null,
    worstAckMs,
    breachedInShift,
    inheritedBreached,
    dueSoon,
    worstOverdueMs,
    worstOverdueCameraId,
    byState,
  };
}

const STATUS_TEXT: Record<MapMarkerStatus, string> = {
  alert: 'EM ALERTA',
  offline: 'FORA DO AR',
  warning: 'COM AVISO',
  unknown: 'SEM ESTADO',
  online: 'OPERANDO',
};

/** Percentual legível; `null` vira texto honesto em vez de "100%". */
export const formatCompliance = (value: number | null): string =>
  value == null ? 'sem amostra' : `${Math.round(value * 100)}%`;

/**
 * Bloco de texto para anexar à passagem de turno. Só descreve o que foi medido.
 */
export function formatPerformanceReport(performance: ShiftPerformance): string {
  const lines: string[] = [];
  lines.push('DESEMPENHO DE ATENDIMENTO (PRAZO)');
  lines.push(
    `  atendidos no turno: ${performance.decided}` +
      (performance.decided > 0
        ? ` (${performance.met} no prazo, ${performance.late} com atraso)`
        : ' — nenhuma ciência dada nesta janela')
  );
  lines.push(`  conformidade: ${formatCompliance(performance.compliance)}`);
  lines.push(
    `  tempo médio até a ciência: ${performance.mttaMs == null ? 'sem amostra' : formatAge(performance.mttaMs)}` +
      (performance.worstAckMs == null ? '' : ` · pior: ${formatAge(performance.worstAckMs)}`)
  );
  lines.push(
    `  vencidos em aberto: ${performance.breachedInShift} no turno` +
      ` + ${performance.inheritedBreached} herdado(s)`
  );
  if (performance.worstOverdueCameraId) {
    lines.push(
      `  maior atraso em aberto: ${performance.worstOverdueCameraId} há ${formatAge(performance.worstOverdueMs)}`
    );
  }
  if (performance.dueSoon > 0) {
    lines.push(`  prestes a vencer: ${performance.dueSoon}`);
  }
  const pending = performance.items.filter(
    (item) => item.verdict.state === 'breached' || item.verdict.state === 'due_soon'
  );
  if (pending.length > 0) {
    lines.push('  pendências com prazo crítico:');
    for (const item of pending) {
      lines.push(
        `    - ${item.cameraId}: ${STATUS_TEXT[item.verdict.budgetStatus]} · ${slaStateLabel(item.verdict.state)}` +
          `${item.verdict.overdueMs > 0 ? ` há ${formatAge(item.verdict.overdueMs)}` : ''}` +
          `${item.inherited ? ' (herdada)' : ''}`
      );
    }
  }
  lines.push('Observação: pendência ainda aberta NÃO entra na média — só atendimento concluído.');
  return lines.join('\n');
}
