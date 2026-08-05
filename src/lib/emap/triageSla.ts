/**
 * Onda 174 — prazo de atendimento da fila de triagem ("estou atrasado?").
 *
 * A Onda 171 respondeu *o que atender primeiro*; a 172/173 registraram *quem
 * deu ciência e quando ela caduca*. Falta o eixo que transforma a fila em
 * compromisso operacional: **quanto tempo eu tinha para olhar isto — e usei?**
 *
 * Sem esse eixo, a fila mede volume mas não desempenho: um alarme atendido em
 * 40 segundos e outro atendido em 4 horas aparecem idênticos no fim do turno.
 *
 * Regras invioláveis (cada uma existe porque a alternativa mente sobre o
 * operador ou sobre o equipamento):
 *
 *  1. **O prazo é do fato, não da câmera.** A contagem começa em `openedAt`
 *     (janela contínua de atenção), nunca no `since` do estado atual. Trocar
 *     de `warning` para `offline` não devolve tempo a ninguém.
 *  2. **O orçamento vem do PIOR estado da janela.** Melhora não afrouxa prazo:
 *     um `alert` que virou `warning` continua cobrado como alarme. O contrário
 *     ensinaria a esperar a degradação passar.
 *  3. **Ciência congela o veredito.** Com ciência válida o resultado é medido
 *     no instante do reconhecimento e nunca mais muda: quem atendeu em 30s não
 *     vira atrasado porque o defeito persistiu. O relógio de solução é outro
 *     livro (168), não este.
 *  4. **Relógio para trás nunca cria violação.** `now` anterior ao início da
 *     janela devolve o orçamento inteiro. Preferimos subestimar o atraso a
 *     acusar um operador por causa de um NTP torto.
 *  5. **Sem orçamento não é "no prazo": é fora de escopo.** Estado saudável
 *     devolve `not_applicable`, que jamais entra no cálculo de conformidade.
 *  6. **Alerta antes do vencimento.** `due_soon` acende quando resta o menor
 *     valor entre 20% do orçamento e `dueSoonFloorMs`, para que o aviso chegue
 *     enquanto ainda dá para agir.
 *  7. **Ciência inválida não conta como atendimento.** O chamador deve passar
 *     apenas ciência já reconciliada (Onda 172/173); um registro de outra
 *     janela (`openedAt` diferente) é ignorado aqui também, por redundância.
 *  8. **Puro e imutável.** Sem `Date.now()`, sem DOM, sem rede, sem mutação das
 *     estruturas recebidas.
 */

import type { AttentionEntry } from './attentionClock';
import type { AckRecord } from './triageAck';
import { severityRank, type MapMarkerStatus } from './floorPlanGeometry';

/** Orçamento de atendimento por gravidade, em milissegundos. */
export interface SlaPolicy {
  /** `null` = sem orçamento (fora de escopo, regra 5). */
  readonly budgetMs: Readonly<Record<MapMarkerStatus, number | null>>;
  /** Piso da antecedência do aviso `due_soon` (regra 6). */
  readonly dueSoonFloorMs: number;
}

export const DEFAULT_SLA_POLICY: SlaPolicy = {
  budgetMs: {
    alert: 2 * 60 * 1000,
    offline: 5 * 60 * 1000,
    warning: 10 * 60 * 1000,
    unknown: 15 * 60 * 1000,
    online: null,
  },
  dueSoonFloorMs: 30 * 1000,
};

export type SlaState =
  /** Fora de escopo: estado saudável, sem orçamento (regra 5). */
  | 'not_applicable'
  /** Em aberto, dentro do prazo e longe do vencimento. */
  | 'on_time'
  /** Em aberto, prestes a vencer (regra 6). */
  | 'due_soon'
  /** Em aberto e já vencido — o atraso continua correndo. */
  | 'breached'
  /** Reconhecido dentro do prazo. Veredito congelado (regra 3). */
  | 'met'
  /** Reconhecido, mas depois do vencimento. Veredito congelado (regra 3). */
  | 'late';

export interface SlaVerdict {
  cameraId: string;
  state: SlaState;
  /** Orçamento aplicado (do pior estado da janela). `null` fora de escopo. */
  budgetMs: number | null;
  /** Estado que determinou o orçamento (regra 2). */
  budgetStatus: MapMarkerStatus;
  /** Início da contagem — sempre `openedAt` (regra 1). */
  startedAt: number;
  /** Instante-limite do atendimento. `null` fora de escopo. */
  dueAt: number | null;
  /** Tempo decorrido considerado (até a ciência, se congelado). */
  elapsedMs: number;
  /** Tempo restante; `0` quando vencido. `null` fora de escopo. */
  remainingMs: number | null;
  /** Atraso acumulado; `0` quando dentro do prazo. */
  overdueMs: number;
  /** Veredito imutável por ciência válida (regra 3). */
  frozen: boolean;
  /** Quando o veredito foi congelado, se foi. */
  frozenAt: number | null;
}

export interface SlaInput {
  entry: AttentionEntry;
  now: number;
  /** Ciência JÁ reconciliada. Registro de outra janela é ignorado (regra 7). */
  ack?: AckRecord | null;
  policy?: SlaPolicy;
}

const isClock = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Orçamento efetivo: pior entre estado atual e pior da janela (regra 2). */
export function slaBudget(
  entry: AttentionEntry,
  policy: SlaPolicy = DEFAULT_SLA_POLICY
): { budgetMs: number | null; budgetStatus: MapMarkerStatus } {
  const current = entry?.status ?? 'online';
  const worst = entry?.worst ?? current;
  const budgetStatus = severityRank(worst) <= severityRank(current) ? worst : current;
  const raw = policy.budgetMs[budgetStatus];
  const budgetMs = isClock(raw) && raw > 0 ? raw : null;
  return { budgetMs, budgetStatus };
}

/** Antecedência do aviso `due_soon` para um dado orçamento (regra 6). */
export function dueSoonWindow(budgetMs: number, policy: SlaPolicy = DEFAULT_SLA_POLICY): number {
  const floor = isClock(policy.dueSoonFloorMs) ? Math.max(policy.dueSoonFloorMs, 0) : 0;
  return Math.min(budgetMs * 0.2, floor);
}

/**
 * Avalia o prazo de atendimento de uma pendência.
 *
 * Nunca lança: entrada inconsistente vira `not_applicable` em vez de um
 * veredito inventado sobre o desempenho de alguém.
 */
export function evaluateSla(input: SlaInput): SlaVerdict {
  const { entry } = input;
  const policy = input.policy ?? DEFAULT_SLA_POLICY;
  const now = input.now;

  const startedAt = isClock(entry?.openedAt) ? entry.openedAt : NaN;
  const { budgetMs, budgetStatus } = slaBudget(entry, policy);

  const outOfScope = (): SlaVerdict => ({
    cameraId: entry?.cameraId ?? '',
    state: 'not_applicable',
    budgetMs: null,
    budgetStatus,
    startedAt: isClock(startedAt) ? startedAt : 0,
    dueAt: null,
    elapsedMs: 0,
    remainingMs: null,
    overdueMs: 0,
    frozen: false,
    frozenAt: null,
  });

  if (!entry || typeof entry.cameraId !== 'string' || entry.cameraId.length === 0) {
    return outOfScope();
  }
  if (!isClock(startedAt) || !isClock(now) || budgetMs == null) return outOfScope();

  const dueAt = startedAt + budgetMs;

  // Regra 3 + 7: só ciência da MESMA janela congela o veredito.
  const ack = input.ack ?? null;
  const frozenAt =
    ack && isClock(ack.at) && ack.openedAt === startedAt && ack.cameraId === entry.cameraId
      ? ack.at
      : null;

  // Regra 4: relógio para trás devolve o orçamento inteiro, nunca cria atraso.
  const reference = frozenAt ?? now;
  const elapsedMs = Math.max(reference - startedAt, 0);
  const overdueMs = Math.max(elapsedMs - budgetMs, 0);
  const remainingMs = Math.max(budgetMs - elapsedMs, 0);

  if (frozenAt != null) {
    return {
      cameraId: entry.cameraId,
      state: overdueMs > 0 ? 'late' : 'met',
      budgetMs,
      budgetStatus,
      startedAt,
      dueAt,
      elapsedMs,
      remainingMs,
      overdueMs,
      frozen: true,
      frozenAt,
    };
  }

  const state: SlaState =
    overdueMs > 0
      ? 'breached'
      : remainingMs <= dueSoonWindow(budgetMs, policy)
        ? 'due_soon'
        : 'on_time';

  return {
    cameraId: entry.cameraId,
    state,
    budgetMs,
    budgetStatus,
    startedAt,
    dueAt,
    elapsedMs,
    remainingMs,
    overdueMs,
    frozen: false,
    frozenAt: null,
  };
}

export interface SlaSummary {
  /** Total avaliado, incluindo fora de escopo. */
  total: number;
  /** Contagem por veredito. */
  byState: Record<SlaState, number>;
  /** Vencidos em aberto — o número que dói. */
  breached: number;
  /** Atendidos com atraso (congelados). */
  late: number;
  /** Atendidos no prazo (congelados). */
  met: number;
  /** Maior atraso observado, em ms. */
  worstOverdueMs: number;
  /** Câmera do maior atraso, se houver. */
  worstCameraId: string | null;
  /**
   * Conformidade sobre decisões concluídas (`met / (met + late)`).
   * `null` quando ainda não há atendimento concluído — nunca fingimos 100%.
   */
  compliance: number | null;
}

const emptyByState = (): Record<SlaState, number> => ({
  not_applicable: 0,
  on_time: 0,
  due_soon: 0,
  breached: 0,
  met: 0,
  late: 0,
});

/** Consolida vereditos em indicadores de turno. Puro e determinístico. */
export function summarizeSla(verdicts: Iterable<SlaVerdict>): SlaSummary {
  const byState = emptyByState();
  let total = 0;
  let worstOverdueMs = 0;
  let worstCameraId: string | null = null;

  for (const verdict of verdicts) {
    if (!verdict || typeof verdict.state !== 'string' || !(verdict.state in byState)) continue;
    total += 1;
    byState[verdict.state] += 1;
    const overdue = isClock(verdict.overdueMs) ? verdict.overdueMs : 0;
    if (
      overdue > worstOverdueMs ||
      (overdue === worstOverdueMs &&
        overdue > 0 &&
        (worstCameraId == null || verdict.cameraId < worstCameraId))
    ) {
      worstOverdueMs = overdue;
      worstCameraId = verdict.cameraId;
    }
  }

  const decided = byState.met + byState.late;
  return {
    total,
    byState,
    breached: byState.breached,
    late: byState.late,
    met: byState.met,
    worstOverdueMs,
    worstCameraId,
    compliance: decided > 0 ? byState.met / decided : null,
  };
}

const STATE_LABEL: Record<SlaState, string> = {
  not_applicable: 'sem prazo',
  on_time: 'no prazo',
  due_soon: 'vence já',
  breached: 'vencido',
  met: 'atendido no prazo',
  late: 'atendido com atraso',
};

export const slaStateLabel = (state: SlaState): string => STATE_LABEL[state] ?? 'sem prazo';

/** Ordem de urgência para exibição: vencido primeiro, fora de escopo por último. */
const STATE_ORDER: Record<SlaState, number> = {
  breached: 0,
  due_soon: 1,
  on_time: 2,
  late: 3,
  met: 4,
  not_applicable: 5,
};

export const slaStateRank = (state: SlaState): number => STATE_ORDER[state] ?? 9;
