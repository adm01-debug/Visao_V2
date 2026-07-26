/**
 * Onda 120 — Justiça do veredito de surdez e conformidade dos produtores.
 *
 * A Onda 119 fechou um buraco e, ao fechá-lo, abriu outro. Três defeitos
 * concretos convivem hoje na fila de relay:
 *
 * **D1 — Regressão da própria Onda 119.** Os produtores interativos gravam
 * TTL de 45s. O normalizador estica isso para os 60s da janela mínima. Só que
 * a Edge Function desiste em 25s e marca a tarefa como `expired`. Antes da
 * Onda 119 essa linha tinha janela de 45s (< 60s) e era descartada do
 * diagnóstico; agora ela tem exatamente 60s e passa a contar como prova de
 * surdez. Ou seja: nós desistimos, e o agente leva a culpa e o reinício.
 *
 * **D2 — `failed` tratado como surdez.** Uma tarefa que o agente reivindicou,
 * executou e devolveu com erro ("câmera recusou 401", "host inalcançável") é
 * contada no numerador da taxa de surdez. Mas ela é a *prova mais forte
 * possível* de que o agente está vivo e ouvindo. Uma câmera quebrada na LAN
 * derruba o agente saudável que a atende.
 *
 * **D3 — Abandono do backend indistinguível de silêncio do agente.** O
 * timeout do lado do servidor grava `status='expired'` direto, sem passar pela
 * classificação da Onda 119.
 *
 * A regra que unifica os três: **só é evidência de surdez a tarefa que teve
 * janela justa, foi oferecida ao agente e não recebeu resposta dele.** Qualquer
 * linha que prove contato — reivindicação, resposta, mesmo com erro — é
 * evidência de vida. E qualquer linha encerrada por decisão nossa é evidência
 * de nada.
 */

/** Como uma tarefa de relay terminou, do ponto de vista do diagnóstico. */
export type RelayOutcome =
  /** Agente reivindicou e devolveu resultado bem-sucedido. */
  | 'done'
  /** Agente reivindicou e devolveu erro (a câmera falhou, não o agente). */
  | 'failed'
  /** Expirou sem ninguém reivindicar. */
  | 'expired_unclaimed'
  /** Reivindicada e expirou sem resposta — agente vivo porém travado. */
  | 'expired_no_response'
  /** Janela curta demais para ser ouvida — culpa do produtor. */
  | 'expired_unfair_window'
  /** A Edge Function desistiu antes do prazo — decisão nossa. */
  | 'backend_abandoned'
  /** Ainda em voo. */
  | 'pending';

/** Peso de uma tarefa no veredito. */
export type EvidenceClass =
  /** Prova que o agente está ouvindo. Vai ao denominador. */
  | 'alive'
  /** Prova que o agente não respondeu tendo tido chance. Numerador e denominador. */
  | 'deaf'
  /** Não diz nada sobre o agente. Fora da conta. */
  | 'inconclusive';

/** Erros gravados por decisão do backend, nunca por silêncio do agente. */
export const BACKEND_ABANDON_ERRORS: readonly string[] = ['relay_backend_abandoned', 'backend_timeout'];

export interface RelayTaskFacts {
  readonly status: 'pending' | 'in_progress' | 'done' | 'failed' | 'expired';
  /** Duração da janela de entrega (`expires_at - scheduled_at`) em segundos. */
  readonly windowSeconds: number;
  /** `true` se o agente chegou a reivindicar a tarefa. */
  readonly claimed: boolean;
  /** Conteúdo de `agent_relay_tasks.error`, se houver. */
  readonly error: string | null;
  /** `true` quando `expires_at` já passou. */
  readonly expired: boolean;
}

export interface VerdictPolicy {
  /** Janela mínima para que a ausência de resposta acuse o agente. */
  readonly fairWindowSeconds: number;
  /** Amostra mínima para o veredito valer. */
  readonly minSample: number;
  /** Fração de surdez a partir da qual o agente é considerado surdo. */
  readonly deafRatioLimit: number;
}

export const DEFAULT_VERDICT_POLICY: VerdictPolicy = {
  fairWindowSeconds: 60,
  minSample: 5,
  deafRatioLimit: 0.5,
};

/**
 * Reduz uma linha da tabela ao seu desfecho canônico. A ordem dos testes é
 * deliberada: causas nossas são checadas antes de qualquer coisa que possa
 * parecer culpa do agente.
 */
export function classifyOutcome(
  facts: RelayTaskFacts,
  policy: VerdictPolicy = DEFAULT_VERDICT_POLICY,
): RelayOutcome {
  const err = facts.error ?? '';

  // D3 — desistência do backend nunca vira acusação.
  if (BACKEND_ABANDON_ERRORS.includes(err)) return 'backend_abandoned';

  // Contato consumado: o agente falou conosco.
  if (facts.status === 'done') return 'done';
  if (facts.status === 'failed') return 'failed';

  const timedOut = facts.status === 'expired' || facts.expired;
  if (!timedOut) return 'pending';

  // D1 — janela injusta é bug do produtor, não silêncio do agente.
  if (err === 'task_expired_unfair_window') return 'expired_unfair_window';
  if (facts.windowSeconds < policy.fairWindowSeconds) return 'expired_unfair_window';

  return facts.claimed ? 'expired_no_response' : 'expired_unclaimed';
}

/**
 * Peso do desfecho. `failed` é deliberadamente 'alive': o agente rodou a
 * requisição e devolveu o erro do alvo. Reiniciá-lo por isso troca um problema
 * de câmera por uma frota instável (D2).
 */
export function classifyEvidence(outcome: RelayOutcome): EvidenceClass {
  switch (outcome) {
    case 'done':
    case 'failed':
    case 'expired_no_response':
      // 'expired_no_response' prova contato (houve claim), mas o agente travou
      // no meio — é o único caso em que reiniciar tem chance real de resolver,
      // então entra como surdez apesar do claim.
      return outcome === 'expired_no_response' ? 'deaf' : 'alive';
    case 'expired_unclaimed':
      return 'deaf';
    case 'expired_unfair_window':
    case 'backend_abandoned':
    case 'pending':
      return 'inconclusive';
  }
}

export interface VerdictInput {
  readonly alive: number;
  readonly deaf: number;
  readonly inconclusive: number;
}

export interface Verdict {
  readonly sample: number;
  /** `null` quando a amostra é pequena demais para concluir qualquer coisa. */
  readonly deafRatio: number | null;
  readonly deaf: boolean;
  readonly reason: string;
}

/** Agrega um conjunto de tarefas em contadores de evidência. */
export function tallyEvidence(
  tasks: readonly RelayTaskFacts[],
  policy: VerdictPolicy = DEFAULT_VERDICT_POLICY,
): VerdictInput {
  let alive = 0;
  let deaf = 0;
  let inconclusive = 0;
  for (const t of tasks) {
    const cls = classifyEvidence(classifyOutcome(t, policy));
    if (cls === 'alive') alive += 1;
    else if (cls === 'deaf') deaf += 1;
    else inconclusive += 1;
  }
  return { alive, deaf, inconclusive };
}

/**
 * Veredito final. O denominador é apenas `alive + deaf`: incluir linhas
 * inconclusivas diluiria a taxa e esconderia um agente realmente surdo.
 */
export function judge(input: VerdictInput, policy: VerdictPolicy = DEFAULT_VERDICT_POLICY): Verdict {
  const sample = input.alive + input.deaf;

  if (sample < policy.minSample) {
    return {
      sample,
      deafRatio: null,
      deaf: false,
      reason: `amostra conclusiva insuficiente (${sample} < ${policy.minSample})`,
    };
  }

  const ratio = input.deaf / sample;
  return {
    sample,
    deafRatio: ratio,
    deaf: ratio >= policy.deafRatioLimit,
    reason:
      ratio >= policy.deafRatioLimit
        ? `${Math.round(ratio * 100)}% das tarefas com janela justa ficaram sem resposta do agente`
        : `${Math.round(ratio * 100)}% de não-resposta, abaixo do limite`,
  };
}

/**
 * Conformidade do produtor: janela que satisfaz a política **e** cobre o
 * tempo que a Edge Function realmente espera. Produtor conforme não depende
 * da correção do trigger — e, principalmente, não gera linha que o
 * diagnóstico teria de descartar depois.
 */
export function conformantTtlSeconds(
  backendTimeoutMs: number,
  policy: VerdictPolicy = DEFAULT_VERDICT_POLICY,
): number {
  return Math.max(policy.fairWindowSeconds, Math.ceil(backendTimeoutMs / 1000));
}
