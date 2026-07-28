/**
 * Onda 187 — reconciliação ativa dos episódios abandonados.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 185 ensinou o sistema a **ver** a ponte travada; a Onda 186 colocou o
 * veredito na frente do operador. Nenhuma das duas deu a ele uma saída. O
 * passivo de episódios abertos há meses continua lá, imune à faxina (Onda 184
 * proíbe apagar episódio aberto, e com razão), inflando o denominador do
 * painel de séries crônicas e mantendo o vigia gritando sobre algo que ninguém
 * consegue drenar. Alarme sem ação possível é ruído.
 *
 * Este módulo é a régua única do fechamento retroativo, espelhada literalmente
 * por `public.reconcile_abandoned_episodes()`.
 *
 * ## As cinco decisões difíceis
 *
 * **1. O fechamento NUNCA é `agora`.** Fechar em `now()` um episódio aberto há
 * 90 dias registraria uma duração de 90 dias para um alarme que quase certamente
 * acabou no primeiro dia. Seria fabricar um fato. O instante de fechamento é
 * `opened_at + ABANDONED_OPEN_DAYS` — um **corte declarado**, reprodutível,
 * idêntico para qualquer executor e em qualquer momento futuro. Não é a verdade
 * (a verdade se perdeu quando a ponte parou); é uma convenção honesta e legível.
 *
 * **2. Reconciliado nunca se disfarça de observado.** Cada episódio fechado por
 * esta via carrega `close_source = 'reconciled'`. Sem essa marca, a duração
 * inventada entraria nas estatísticas de série crônica como se tivesse sido
 * medida. Quem lê o número precisa saber que ele é convenção.
 *
 * **3. Só o passivo entra.** Um episódio aberto há 3 horas é um alarme em
 * curso, não um resíduo. O corte de {@link ABANDONED_OPEN_DAYS} dias é o mesmo
 * publicado por `alarm_recurrence_retention_policy()` e o mesmo que o vigia
 * conta como `abandonedOpen` — três leitores, um número. Divergir aqui faria o
 * operador reconciliar e o vigia continuar acusando.
 *
 * **4. Mais velho primeiro, com teto.** A drenagem é ordenada por `opened_at`
 * crescente e limitada a {@link MAX_RECONCILE_PER_RUN}. Uma reconciliação que
 * tenta fechar 40 mil episódios numa transação trava a tabela; e o operador
 * precisa ver a fila baixar a cada execução, não esperar por uma que nunca
 * termina.
 *
 * **5. Leitura ilegível é descartada, não corrigida.** Abertura no futuro ou
 * carimbo inválido não vira `closed_at` — o registro é pulado com motivo
 * explícito. Adivinhar o instante de um relógio quebrado é a mesma fabricação
 * que a decisão 1 recusa.
 */

/** Dias de abertura a partir dos quais um episódio é passivo, não alarme. */
export const ABANDONED_OPEN_DAYS = 30;

/** Teto de episódios fechados por execução. */
export const MAX_RECONCILE_PER_RUN = 500;

const DAY_MS = 86_400_000;

/** Corte, em ms, aplicado sobre `opened_at` para produzir o fechamento. */
export const RECONCILE_OFFSET_MS = ABANDONED_OPEN_DAYS * DAY_MS;

/** Um episódio aberto, candidato à reconciliação. */
export interface OpenEpisode {
  readonly id: string;
  readonly seriesKey: string;
  /** Instante de abertura, em ms. */
  readonly openedAt: number;
}

/** Motivo pelo qual um candidato não foi reconciliado. */
export type SkipReason =
  | 'still_active'
  | 'unreadable_clock'
  | 'over_batch_limit';

/** Fechamento planejado para um episódio. */
export interface PlannedClose {
  readonly id: string;
  readonly seriesKey: string;
  readonly openedAt: number;
  /** Sempre `openedAt + RECONCILE_OFFSET_MS`. Jamais `now`. */
  readonly closedAt: number;
  /** Sempre exatamente {@link RECONCILE_OFFSET_MS}. */
  readonly durationMs: number;
}

/** Candidato recusado, com o motivo. */
export interface SkippedEpisode {
  readonly id: string;
  readonly reason: SkipReason;
}

/** Plano completo de uma execução de reconciliação. */
export interface ReconciliationPlan {
  readonly closes: readonly PlannedClose[];
  readonly skipped: readonly SkippedEpisode[];
  /** Candidatos elegíveis que ficaram de fora por causa do teto do lote. */
  readonly deferred: number;
  /** Frase em português descrevendo a execução. */
  readonly summary: string;
}

/**
 * Monta o plano de reconciliação.
 *
 * A ordem é deliberada: primeiro descarta relógio ilegível, depois separa o que
 * ainda é alarme em curso, e só então ordena o passivo por antiguidade e aplica
 * o teto. Aplicar o teto antes da ordenação faria a execução drenar episódios
 * arbitrários e deixar os mais antigos — exatamente os que sustentam o veredito
 * do vigia — para trás indefinidamente.
 */
export function planEpisodeReconciliation(
  candidates: readonly OpenEpisode[],
  now: number,
  limit: number = MAX_RECONCILE_PER_RUN,
): ReconciliationPlan {
  const cap = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), MAX_RECONCILE_PER_RUN)
    : MAX_RECONCILE_PER_RUN;

  if (!Number.isFinite(now)) {
    return {
      closes: [],
      skipped: candidates.map((c) => ({ id: c.id, reason: 'unreadable_clock' as const })),
      deferred: 0,
      summary: 'Reconciliação abortada: relógio de referência ilegível.',
    };
  }

  const cutoff = now - RECONCILE_OFFSET_MS;
  const skipped: SkippedEpisode[] = [];
  const eligible: OpenEpisode[] = [];

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.openedAt) || candidate.openedAt > now) {
      // Abertura no futuro é relógio quebrado. Fechá-la produziria um
      // `closed_at` também no futuro — sujeira gravada como fato.
      skipped.push({ id: candidate.id, reason: 'unreadable_clock' });
      continue;
    }
    if (candidate.openedAt > cutoff) {
      skipped.push({ id: candidate.id, reason: 'still_active' });
      continue;
    }
    eligible.push(candidate);
  }

  const ordered = [...eligible].sort((a, b) => a.openedAt - b.openedAt);
  const batch = ordered.slice(0, cap);
  const deferredList = ordered.slice(cap);
  for (const item of deferredList) {
    skipped.push({ id: item.id, reason: 'over_batch_limit' });
  }

  const closes: PlannedClose[] = batch.map((item) => ({
    id: item.id,
    seriesKey: item.seriesKey,
    openedAt: item.openedAt,
    closedAt: item.openedAt + RECONCILE_OFFSET_MS,
    durationMs: RECONCILE_OFFSET_MS,
  }));

  const summary =
    closes.length === 0
      ? 'Reconciliação: nenhum episódio abandonado elegível.'
      : `Reconciliação: ${closes.length} episódio(s) abandonado(s) encerrado(s) no corte de ${ABANDONED_OPEN_DAYS} dias` +
        (deferredList.length > 0 ? `; ${deferredList.length} adiado(s) para a próxima execução.` : '.');

  return { closes, skipped, deferred: deferredList.length, summary };
}
