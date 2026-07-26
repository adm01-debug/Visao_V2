/**
 * Onda 133 — Ciclo de vida das entradas compartilhadas e preservação da prova.
 *
 * Fonte da verdade em TypeScript da MESMA regra aplicada no banco por
 * `public.collab_entry_lifecycle_policy()` e `public.collab_purge_entries()`.
 * A paridade é verificada no CI por `scripts/check-collab-entry-lifecycle.mjs`.
 *
 * ## Os dois defeitos que esta onda corrige
 *
 * 1. **Entrada compartilhada era eterna.** `collab_entries.expires_at` existia,
 *    e a consulta respeitava o prazo, mas nada nunca apagava a linha. Um hash
 *    de placa revogado em 2026 continuaria guardado indefinidamente — o dado
 *    some da busca, mas continua armazenado. LGPD mede armazenamento, não
 *    visibilidade.
 *
 * 2. **Apagar a entrada destruía a prova do leitor.** `collab_matches.entry_id`
 *    tinha `ON DELETE CASCADE`. Quem *cadastrou* a placa podia, apagando a
 *    própria entrada, evaporar o histórico de avistamentos registrado por
 *    OUTRA organização. Prova de terceiro não pode depender da boa vontade do
 *    autor do alerta. Por isso o avistamento agora guarda uma cópia mínima
 *    (organização dona, hash e motivo) e sobrevive à morte da entrada, com
 *    `entry_id` virando nulo em vez de levar a linha junto.
 *
 * ## A regra de expurgo
 *
 * Duas retenções independentes, aplicadas na ordem abaixo:
 *
 *  - **avistamentos** (`collab_matches`): apagados após `matchRetentionDays`
 *    contados do avistamento. É o registro operacional do leitor;
 *  - **entradas** (`collab_entries`): elegíveis quando revogadas há mais de
 *    `revokedGraceDays`, ou vencidas há mais de `expiredGraceDays`.
 *
 * A carência existe para o caso banal de revogação por engano: apagar no
 * mesmo instante impediria o desfazer e ainda arrancaria contexto de um
 * avistamento recente que ainda aponta para a entrada.
 *
 * ## Por que o expurgo é limitado por lote
 *
 * `DELETE` sem teto numa tabela de rede segura lock por minutos e atrasa a
 * gravação de avistamentos, que é o caminho quente. Cada execução apaga no
 * máximo `maxDeletePerRun` linhas por tabela e sinaliza `truncated`; o cron
 * diário converge em vez de tentar tudo de uma vez.
 */

/** Política de ciclo de vida — espelho de `public.collab_entry_lifecycle_policy()`. */
export const COLLAB_ENTRY_LIFECYCLE_POLICY = {
  /** Folga após a revogação antes de apagar de fato (permite desfazer). */
  revokedGraceDays: 30,
  /** Folga após o vencimento natural da entrada. */
  expiredGraceDays: 30,
  /** Retenção do avistamento, contada de `matched_at`. */
  matchRetentionDays: 180,
  /** Teto de linhas apagadas por tabela em cada execução. */
  maxDeletePerRun: 5000,
} as const;

/** Estado de uma entrada no momento da decisão de expurgo. */
export interface CollabEntrySubject {
  /** Dias desde `revoked_at`; `null` quando a entrada nunca foi revogada. */
  readonly revokedAgeDays: number | null;
  /**
   * Dias desde `expires_at`. Negativo significa que ainda falta tempo para
   * vencer — entrada viva.
   */
  readonly expiredAgeDays: number;
}

/**
 * `true` quando a entrada já pode ser apagada fisicamente.
 *
 * Revogação e vencimento são caminhos independentes: basta um deles ter
 * cumprido a própria carência. Revogar uma entrada já vencida não reinicia o
 * relógio nem o prolonga.
 */
export function isEntryPurgeable(subject: CollabEntrySubject): boolean {
  const p = COLLAB_ENTRY_LIFECYCLE_POLICY;

  const revoked = subject.revokedAgeDays;
  if (revoked !== null) {
    if (!Number.isFinite(revoked)) return false;
    if (revoked > p.revokedGraceDays) return true;
  }

  if (!Number.isFinite(subject.expiredAgeDays)) return false;
  return subject.expiredAgeDays > p.expiredGraceDays;
}

/** `true` quando o avistamento já passou da retenção operacional. */
export function isMatchPurgeable(matchAgeDays: number): boolean {
  if (!Number.isFinite(matchAgeDays) || matchAgeDays < 0) return false;
  return matchAgeDays > COLLAB_ENTRY_LIFECYCLE_POLICY.matchRetentionDays;
}

/** Resultado de uma execução do expurgo — espelho do JSON devolvido pelo banco. */
export interface CollabEntryPurgeOutcome {
  readonly deletedMatches: number;
  readonly deletedEntries: number;
  /** Ainda havia elegíveis em alguma das tabelas quando o lote acabou. */
  readonly truncated: boolean;
}

/**
 * Simula uma execução do expurgo — usado nos testes e no gate para comparar a
 * decisão do TypeScript com a do banco.
 */
export function planEntryPurge(input: {
  readonly entries: readonly CollabEntrySubject[];
  readonly matchAgesDays: readonly number[];
}): CollabEntryPurgeOutcome {
  const limit = COLLAB_ENTRY_LIFECYCLE_POLICY.maxDeletePerRun;

  const eligibleMatches = input.matchAgesDays.filter(isMatchPurgeable).length;
  const eligibleEntries = input.entries.filter(isEntryPurgeable).length;

  const deletedMatches = Math.min(eligibleMatches, limit);
  const deletedEntries = Math.min(eligibleEntries, limit);

  return {
    deletedMatches,
    deletedEntries,
    truncated: eligibleMatches > deletedMatches || eligibleEntries > deletedEntries,
  };
}
