/**
 * Onda 142 — regra única das 4 invariantes estruturais do árbitro de cura.
 *
 * O gate de CI (`scripts/check-healing-arbiter.mjs`) já valida estas mesmas
 * quatro invariantes contra o banco de desenvolvimento. Isso responde "o código
 * está correto?", mas não responde "o banco de PRODUÇÃO ainda está correto?" —
 * uma migração manual, um `GRANT` acidental ou um restore parcial podem quebrar
 * qualquer uma delas sem que nenhum teste falhe.
 *
 * Este módulo é apenas apresentação: nomes, explicações e a consequência real de
 * cada quebra. Quem avalia é a função `public.healing_arbiter_invariants()`,
 * restrita a administradores.
 */

/** Chaves retornadas pela função do banco. Ordem = ordem de exibição. */
export const ARBITER_INVARIANT_KEYS = [
  'observe_action_allowed',
  'observe_never_carries_task',
  'arbiter_not_client_executable',
  'run_summary_counts_observed',
] as const;

export type ArbiterInvariantKey = (typeof ARBITER_INVARIANT_KEYS)[number];

export interface ArbiterInvariantMeta {
  readonly key: ArbiterInvariantKey;
  /** Rótulo curto, legível por um operador. */
  readonly label: string;
  /** O que a invariante garante. */
  readonly rationale: string;
  /** O que acontece de errado quando ela cai. */
  readonly impact: string;
}

export const ARBITER_INVARIANT_META: Readonly<Record<ArbiterInvariantKey, ArbiterInvariantMeta>> = {
  observe_action_allowed: {
    key: 'observe_action_allowed',
    label: 'Ação "observar" é aceita',
    rationale: 'O registro de ações de cura precisa aceitar a decisão de observar sem agir.',
    impact:
      'Sem ela, o árbitro não consegue gravar o veto: a varredura falha e o rastro fica vazio.',
  },
  observe_never_carries_task: {
    key: 'observe_never_carries_task',
    label: '"Observar" nunca enfileira tarefa',
    rationale: 'Uma decisão de não agir não pode carregar uma tarefa de relay associada.',
    impact: 'Sem ela, um agente vetado ainda receberia o comando — o veto viraria ficção na tela.',
  },
  arbiter_not_client_executable: {
    key: 'arbiter_not_client_executable',
    label: 'Árbitro fora do alcance do cliente',
    rationale:
      'A função de arbitragem não pode ser executável por visitantes nem por usuários comuns.',
    impact: 'Sem ela, qualquer sessão autenticada sondaria a lógica de decisão da frota.',
  },
  run_summary_counts_observed: {
    key: 'run_summary_counts_observed',
    label: 'Varredura contabiliza observados',
    rationale:
      'O resumo de cada execução precisa registrar quantos agentes foram apenas observados.',
    impact:
      'Sem ela, episódios vetados somem das métricas e a frota parece mais saudável do que é.',
  },
};

export interface ArbiterInvariantResult {
  readonly key: ArbiterInvariantKey;
  readonly ok: boolean;
  /** Definição real lida do banco (constraint, privilégio ou tipo da coluna). */
  readonly detail: string;
}

export interface ArbiterInvariantRow extends ArbiterInvariantResult {
  readonly meta: ArbiterInvariantMeta;
}

/** Linha desconhecida retornada pelo banco é ignorada; ausente vira falha explícita. */
export function buildInvariantRows(
  results: readonly ArbiterInvariantResult[]
): ArbiterInvariantRow[] {
  const byKey = new Map(results.map((r) => [r.key, r]));
  return ARBITER_INVARIANT_KEYS.map((key) => {
    const found = byKey.get(key);
    return {
      key,
      ok: found?.ok ?? false,
      detail: found?.detail ?? 'invariante não avaliada pelo banco',
      meta: ARBITER_INVARIANT_META[key],
    };
  });
}

export interface ArbiterInvariantSummary {
  readonly total: number;
  readonly failing: number;
  readonly healthy: boolean;
}

export function summarizeInvariants(rows: readonly ArbiterInvariantRow[]): ArbiterInvariantSummary {
  const failing = rows.filter((row) => !row.ok).length;
  return { total: rows.length, failing, healthy: rows.length > 0 && failing === 0 };
}
