/**
 * Onda 119 — Integridade temporal da fila de relay.
 *
 * A Onda 118 passou a agendar tarefas no futuro (`scheduled_at`, jitter de até
 * 540s). Isso criou uma armadilha silenciosa: o TTL da tarefa continuava sendo
 * contado a partir de `now()`, não de `scheduled_at`. Uma tarefa jitterada com
 * TTL curto expira ANTES de ser oferecida ao agente — e, pior, a rotina de cura
 * conta tarefas expiradas como prova de que o agente está surdo. O resultado
 * seria um laço de realimentação: TTL mal calibrado → agente parece surdo →
 * reinício → nova tarefa jitterada → expira de novo.
 *
 * Este módulo é a fonte única de verdade das duas regras que quebram esse laço:
 *
 *  1. **Janela válida** — toda tarefa precisa de uma janela de entrega
 *     (`scheduled_at` → `expires_at`) estritamente positiva e não menor que o
 *     mínimo operacional. Normalizamos na escrita em vez de rejeitar, para que
 *     um produtor descuidado não derrube a cura.
 *
 *  2. **Justiça do diagnóstico** — só conta como evidência de surdez a tarefa
 *     que teve janela suficiente para ser ouvida (≥ um ciclo de poll do
 *     agente). Culpar o agente por uma janela que nós mesmos encurtamos é
 *     diagnóstico errado, e diagnóstico errado gera ação destrutiva.
 *
 * O PL/pgSQL espelha estas constantes; o gate de CI compara literal a literal.
 */

/** Política temporal da fila. Espelhada em SQL — mudou aqui, mude lá. */
export interface RelayWindowPolicy {
  /** Intervalo de poll do agente local, em segundos. */
  readonly agentPollSeconds: number;
  /** Janela mínima de entrega aplicada na normalização, em segundos. */
  readonly minWindowSeconds: number;
  /** Janela mínima para que uma expiração conte como surdez, em segundos. */
  readonly fairWindowSeconds: number;
  /** Teto de sanidade da janela, em segundos — evita tarefa zumbi eterna. */
  readonly maxWindowSeconds: number;
}

export const DEFAULT_RELAY_WINDOW_POLICY: RelayWindowPolicy = {
  agentPollSeconds: 20,
  minWindowSeconds: 60,
  fairWindowSeconds: 60,
  maxWindowSeconds: 3600,
};

/** Tarefa como o produtor a propôs, em segundos relativos ao instante de escrita. */
export interface ProposedWindow {
  /** Atraso até a tarefa ficar elegível (jitter da Onda 118). */
  readonly scheduledInSeconds: number;
  /** Instante de expiração proposto; `null` deixa a política decidir. */
  readonly expiresInSeconds: number | null;
}

export interface NormalizedWindow {
  readonly scheduledInSeconds: number;
  readonly expiresInSeconds: number;
  /** Duração real da janela de entrega. */
  readonly windowSeconds: number;
  /** `true` quando a proposta do produtor teve de ser corrigida. */
  readonly adjusted: boolean;
  readonly reason: string;
}

/**
 * Normaliza a janela de entrega proposta.
 *
 * Regra de projeto: **corrigir, nunca rejeitar**. Um `INSERT` recusado no meio
 * da rotina de cura abortaria a varredura inteira e deixaria a frota sem
 * tratamento — falha muito pior do que um TTL esticado.
 */
export function normalizeWindow(
  proposed: ProposedWindow,
  policy: RelayWindowPolicy = DEFAULT_RELAY_WINDOW_POLICY,
): NormalizedWindow {
  const scheduled = Math.max(0, Math.round(proposed.scheduledInSeconds));
  const proposedExpiry = proposed.expiresInSeconds;

  const floor = scheduled + policy.minWindowSeconds;
  const ceiling = scheduled + policy.maxWindowSeconds;

  if (proposedExpiry === null) {
    return {
      scheduledInSeconds: scheduled,
      expiresInSeconds: floor,
      windowSeconds: policy.minWindowSeconds,
      adjusted: false,
      reason: 'janela padrão aplicada a partir do agendamento',
    };
  }

  const requested = Math.round(proposedExpiry);

  if (requested < floor) {
    return {
      scheduledInSeconds: scheduled,
      expiresInSeconds: floor,
      windowSeconds: policy.minWindowSeconds,
      adjusted: true,
      reason:
        'expiração anterior à janela mínima após o agendamento; TTL esticado para a tarefa poder ser entregue',
    };
  }

  if (requested > ceiling) {
    return {
      scheduledInSeconds: scheduled,
      expiresInSeconds: ceiling,
      windowSeconds: policy.maxWindowSeconds,
      adjusted: true,
      reason: 'expiração acima do teto de sanidade; TTL truncado para evitar tarefa zumbi',
    };
  }

  return {
    scheduledInSeconds: scheduled,
    expiresInSeconds: requested,
    windowSeconds: requested - scheduled,
    adjusted: false,
    reason: 'janela proposta aceita',
  };
}

/**
 * Uma tarefa expirada só é evidência de surdez se o agente teve uma janela
 * justa para ouvi-la. Caso contrário a culpa é do produtor, não do agente.
 */
export function countsAsDeafEvidence(
  windowSeconds: number,
  policy: RelayWindowPolicy = DEFAULT_RELAY_WINDOW_POLICY,
): boolean {
  return windowSeconds >= policy.fairWindowSeconds;
}

/** Motivo gravado em `agent_relay_tasks.error` quando a tarefa expira. */
export type ExpiryReason = 'task_expired_unfair_window' | 'task_expired_unclaimed' | 'task_expired_no_response';

export interface ExpiredTaskFacts {
  readonly windowSeconds: number;
  /** `true` se o agente chegou a reivindicar a tarefa. */
  readonly claimed: boolean;
}

/**
 * Classifica a expiração. Os três casos exigem reações diferentes:
 * janela injusta é bug nosso, não reivindicada é agente surdo, e reivindicada
 * sem resposta é agente vivo porém travado — este último é o único em que
 * reiniciar tem chance real de resolver.
 */
export function classifyExpiry(
  facts: ExpiredTaskFacts,
  policy: RelayWindowPolicy = DEFAULT_RELAY_WINDOW_POLICY,
): ExpiryReason {
  if (!countsAsDeafEvidence(facts.windowSeconds, policy)) return 'task_expired_unfair_window';
  return facts.claimed ? 'task_expired_no_response' : 'task_expired_unclaimed';
}

/** Motivos de expiração que alimentam a razão de surdez da Onda 115. */
export const DEAF_EVIDENCE_REASONS: readonly ExpiryReason[] = [
  'task_expired_unclaimed',
  'task_expired_no_response',
];
