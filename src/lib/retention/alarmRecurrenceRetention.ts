/**
 * Onda 184 — regra de retenção dos episódios de reincidência de alarme.
 *
 * ## O defeito que esta onda corrige
 *
 * `alarm_recurrence_episodes` (Onda 180) é append-only e cresce para sempre.
 * Dado operacional sem prazo de guarda declarado é passivo: engorda o banco,
 * degrada as agregações da Onda 183 e, no limite, guarda por anos o histórico
 * de comportamento de um local. Faltava prazo e faltava supervisão — o
 * registro da Onda 134 só enxerga rotinas que tenham tabela `%_purge_runs`.
 *
 * ## As três decisões difíceis
 *
 * **1. Episódio aberto nunca é apagado.** Um episódio sem `closed_at` é um
 * alarme que, até onde o livro sabe, ainda está acontecendo. Removê-lo por
 * idade destruiria o denominador de uma reincidência em curso e faria a série
 * "melhorar" sozinha no painel. Aberto antigo vira FATO CONTADO
 * (`abandonedOpen`), reportado a cada execução: é sintoma de ponte de
 * episódios que não fechou, e o lugar disso é o relatório, não a lixeira.
 *
 * **2. O prazo conta pelo fechamento, não pela abertura.** Um episódio que
 * abriu há 400 dias e encerrou ontem é informação de ontem. Contar pela
 * abertura apagaria justamente o registro dos alarmes mais longos — os mais
 * graves.
 *
 * **3. O prazo tem de ser folgadamente maior que a janela de reincidência.**
 * Se o expurgo alcançasse dado que `assessRecurrence` ainda consulta, apagar
 * uma linha mudaria o veredito exibido: a série "sararia" por efeito da
 * faxina. O gate exige margem de 100× sobre a janela.
 *
 * Este arquivo é a fonte da verdade espelhada por
 * `public.alarm_recurrence_retention_policy()`; a paridade literal é conferida
 * por `scripts/check-alarm-recurrence-retention.mjs`.
 */

/** Dias de guarda de um episódio já encerrado. */
export const CLOSED_RETENTION_DAYS = 365;

/** A partir de quantos dias um episódio ainda aberto é reportado como abandonado. */
export const ABANDONED_OPEN_DAYS = 30;

/** Teto de linhas removidas por execução — mantém a transação curta. */
export const MAX_DELETE_PER_RUN = 5000;

/** Resultado de uma execução da rotina de expurgo. */
export interface AlarmRecurrencePurgeRun {
  /** Linhas efetivamente removidas nesta execução. */
  readonly deletedEpisodes: number;
  /** Linhas ainda elegíveis depois desta execução (resto declarado). */
  readonly pendingEpisodes: number;
  /** Episódios abertos além do prazo — contados, jamais removidos. */
  readonly abandonedOpen: number;
  /** `true` quando o teto interrompeu a execução antes de esgotar a fila. */
  readonly truncated: boolean;
}

/** Situação de uma execução, para leitura humana. */
export type PurgeOutcome = 'clean' | 'truncated' | 'abandoned_backlog';

/**
 * Classifica o resultado de uma execução.
 *
 * Ordem deliberada: uma execução truncada é sempre reportada como truncada,
 * ainda que também haja episódios abandonados — o resto pendente é o problema
 * imediato (a fila não esvazia), o abandono é crônico.
 */
export function classifyPurgeOutcome(run: AlarmRecurrencePurgeRun): PurgeOutcome {
  if (run.truncated || run.pendingEpisodes > 0) return 'truncated';
  if (run.abandonedOpen > 0) return 'abandoned_backlog';
  return 'clean';
}

/** Frase em português para o resultado de uma execução. */
export function describePurgeOutcome(run: AlarmRecurrencePurgeRun): string {
  switch (classifyPurgeOutcome(run)) {
    case 'truncated':
      return `${run.deletedEpisodes} episódio(s) expurgado(s); ainda restam ${run.pendingEpisodes} fora do prazo.`;
    case 'abandoned_backlog':
      return `${run.deletedEpisodes} episódio(s) expurgado(s); ${run.abandonedOpen} episódio(s) seguem abertos há mais de ${ABANDONED_OPEN_DAYS} dias e não foram removidos.`;
    case 'clean':
      return `${run.deletedEpisodes} episódio(s) expurgado(s); nada pendente.`;
  }
}

/**
 * `true` quando o episódio pode ser removido no instante `now`.
 *
 * Espelha literalmente o predicado SQL. `closedAt` nulo ou ilegível responde
 * `false`: sem prova de encerramento, não se apaga.
 */
export function isPurgeable(
  episode: { readonly closedAt: number | null },
  now: number,
  retentionDays: number = CLOSED_RETENTION_DAYS,
): boolean {
  const { closedAt } = episode;
  if (closedAt === null || !Number.isFinite(closedAt)) return false;
  if (!Number.isFinite(now)) return false;
  return closedAt < now - retentionDays * 86_400_000;
}

/**
 * `true` quando um episódio ainda aberto já passou do prazo de abandono.
 * Não implica remoção — implica relato.
 */
export function isAbandonedOpen(
  episode: { readonly closedAt: number | null; readonly openedAt: number },
  now: number,
  abandonDays: number = ABANDONED_OPEN_DAYS,
): boolean {
  if (episode.closedAt !== null) return false;
  if (!Number.isFinite(episode.openedAt) || !Number.isFinite(now)) return false;
  return episode.openedAt < now - abandonDays * 86_400_000;
}
