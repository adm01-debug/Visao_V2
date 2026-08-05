/**
 * Onda 121 — Locação de execução (lease) e reentrega limitada da fila de relay.
 *
 * As Ondas 119/120 tornaram o *diagnóstico* justo, mas a fila continuou com um
 * defeito de entrega: **`claim` é destrutivo e sem contrato de tempo**. Assim
 * que o agente reivindica uma tarefa (`status='in_progress'`), ela sai do
 * conjunto reivindicável para sempre. Se o processo do agente morrer, o
 * contêiner for reiniciado (justamente pela Onda 115!) ou a rede cair no meio
 * da execução, a tarefa fica encalhada até `expires_at` e morre sem nunca ter
 * sido executada. Três consequências concretas:
 *
 *  **D1 — Perda silenciosa de trabalho.** Um `self_heal_restart` reivindicado
 *  por um agente que morre no instante seguinte nunca é reexecutado. A cura da
 *  Onda 115 acredita ter agido; nada aconteceu.
 *
 *  **D2 — Realimentação da própria cura.** O reinício provocado pela Onda 115
 *  mata o agente com tarefas em voo. Elas expiram como `no_response`, o que a
 *  Onda 120 lê como "vivo porém travado" — e a escada de cura sobe de novo.
 *  O remédio produz o sintoma que justifica mais remédio.
 *
 *  **D3 — Ausência de granularidade entre "travou uma vez" e "está morto".**
 *  Sem contagem de tentativas, uma falha transitória tem o mesmo peso de uma
 *  falha permanente.
 *
 * A correção é o modelo clássico de fila com *lease*: a reivindicação passa a
 * ser um **empréstimo com prazo**, não uma transferência definitiva. Vencido o
 * empréstimo sem conclusão, a tarefa volta para `pending` com recuo
 * exponencial, até um teto de tentativas e um prazo final absoluto.
 *
 * Invariantes que o simulador e o gate de CI verificam:
 *
 *  I1  Tarefa com lease vigente nunca é reentregue (sem execução dupla).
 *  I2  Reentrega jamais ultrapassa `maxAttempts`.
 *  I3  Reentrega jamais estende a tarefa além do prazo final absoluto.
 *  I4  Toda reentrega concede janela ≥ `minWindowSeconds` (justiça da Onda 119).
 *  I5  O recuo é monotônico não decrescente e limitado por `backoffMaxSeconds`.
 *  I6  Terminar por decisão nossa (teto/prazo) nunca gera motivo que acuse o
 *      agente de surdez.
 *  I7  O planejamento é uma função pura do estado — reexecutá-lo sobre o mesmo
 *      estado devolve o mesmo plano (idempotência do reaper).
 *
 * O PL/pgSQL espelha estas constantes e estes motivos; o gate compara literal
 * a literal.
 */

import { DEFAULT_RELAY_WINDOW_POLICY } from './relayTaskWindow';

/** Política de locação. Espelhada em SQL — mudou aqui, mude lá. */
export interface RelayLeasePolicy {
  /** Prazo do empréstimo concedido no `claim`, em segundos. */
  readonly leaseSeconds: number;
  /** Número máximo de reivindicações por tarefa. */
  readonly maxAttempts: number;
  /** Base do recuo exponencial entre reentregas, em segundos. */
  readonly backoffBaseSeconds: number;
  /** Teto do recuo, em segundos. */
  readonly backoffMaxSeconds: number;
  /** Janela mínima concedida a cada reentrega, em segundos. */
  readonly minWindowSeconds: number;
  /** Prazo final absoluto contado de `created_at`, em segundos. */
  readonly hardDeadlineSeconds: number;
}

export const DEFAULT_RELAY_LEASE_POLICY: RelayLeasePolicy = {
  leaseSeconds: 45,
  maxAttempts: 3,
  backoffBaseSeconds: 5,
  backoffMaxSeconds: 60,
  minWindowSeconds: DEFAULT_RELAY_WINDOW_POLICY.minWindowSeconds,
  hardDeadlineSeconds: DEFAULT_RELAY_WINDOW_POLICY.maxWindowSeconds,
};

/** Motivos terminais gravados em `agent_relay_tasks.error` pela Onda 121. */
export type LeaseExpiryReason =
  /** Reivindicada `maxAttempts` vezes sem nunca concluir — agente travado. */
  | 'task_expired_attempts_exhausted'
  /** Não cabe mais reentrega dentro do prazo final — decisão nossa. */
  | 'task_expired_deadline';

/** Motivos da Onda 119 continuam válidos para tarefas nunca reivindicadas. */
export type TerminalReason =
  | LeaseExpiryReason
  | 'task_expired_unfair_window'
  | 'task_expired_unclaimed'
  | 'task_expired_no_response';

/**
 * Motivos que NÃO podem acusar o agente (I6). `task_expired_deadline` é
 * encerramento administrativo: o relógio acabou, não houve silêncio provado.
 */
export const NEUTRAL_TERMINAL_REASONS: readonly TerminalReason[] = [
  'task_expired_unfair_window',
  'task_expired_deadline',
];

/** Estado relevante de uma linha da fila, em segundos relativos a `created_at`. */
export interface LeaseFacts {
  readonly status: 'pending' | 'in_progress';
  /** Instante atual, em segundos desde `created_at`. */
  readonly nowSeconds: number;
  /** `expires_at` atual, em segundos desde `created_at`. */
  readonly expiresAtSeconds: number;
  /** `scheduled_at` atual, em segundos desde `created_at`. */
  readonly scheduledAtSeconds: number;
  /** `lease_expires_at`, ou `null` quando a tarefa não está emprestada. */
  readonly leaseExpiresAtSeconds: number | null;
  /** Quantas vezes a tarefa já foi reivindicada. */
  readonly attempts: number;
}

export type LeaseAction = 'keep' | 'requeue' | 'expire';

export interface LeasePlan {
  readonly action: LeaseAction;
  /** Preenchido apenas em `requeue`. */
  readonly nextScheduledAtSeconds: number | null;
  /** Preenchido apenas em `requeue`. */
  readonly nextExpiresAtSeconds: number | null;
  /** Preenchido apenas em `expire`. */
  readonly reason: TerminalReason | null;
  /** Explicação legível, usada na telemetria. */
  readonly detail: string;
}

const KEEP = (detail: string): LeasePlan => ({
  action: 'keep',
  nextScheduledAtSeconds: null,
  nextExpiresAtSeconds: null,
  reason: null,
  detail,
});

const EXPIRE = (reason: TerminalReason, detail: string): LeasePlan => ({
  action: 'expire',
  nextScheduledAtSeconds: null,
  nextExpiresAtSeconds: null,
  reason,
  detail,
});

/**
 * Recuo exponencial determinístico. Depende só do número de tentativas já
 * feitas, portanto é idempotente sobre o mesmo estado (I7) e monotônico (I5).
 */
export function backoffSeconds(
  attempts: number,
  policy: RelayLeasePolicy = DEFAULT_RELAY_LEASE_POLICY
): number {
  const n = Math.max(1, Math.floor(attempts));
  const raw = policy.backoffBaseSeconds * 2 ** (n - 1);
  return Math.min(policy.backoffMaxSeconds, raw);
}

/**
 * Decide o destino de uma tarefa em voo. Função pura: o reaper SQL apenas
 * executa este plano.
 */
export function planLease(
  facts: LeaseFacts,
  policy: RelayLeasePolicy = DEFAULT_RELAY_LEASE_POLICY
): LeasePlan {
  const { nowSeconds: now } = facts;

  if (facts.status === 'in_progress') {
    const lease = facts.leaseExpiresAtSeconds;

    // Lease ausente em tarefa emprestada é dado corrompido (linha anterior à
    // migração). Tratamos como vencido para não criar tarefa zumbi eterna.
    if (lease !== null && lease > now) {
      return KEEP('lease vigente — reentrega proibida para não duplicar execução');
    }

    if (facts.attempts >= policy.maxAttempts) {
      return EXPIRE(
        'task_expired_attempts_exhausted',
        `reivindicada ${facts.attempts}x sem conclusão; teto de tentativas atingido`
      );
    }

    const wait = backoffSeconds(facts.attempts, policy);
    const nextScheduled = now + wait;
    const nextExpires = nextScheduled + policy.minWindowSeconds;

    if (nextExpires > policy.hardDeadlineSeconds) {
      return EXPIRE(
        'task_expired_deadline',
        'não cabe outra janela justa antes do prazo final absoluto da tarefa'
      );
    }

    return {
      action: 'requeue',
      nextScheduledAtSeconds: nextScheduled,
      nextExpiresAtSeconds: nextExpires,
      reason: null,
      detail: `lease vencido; reentrega ${facts.attempts + 1}/${policy.maxAttempts} após ${wait}s de recuo`,
    };
  }

  // status === 'pending'
  if (facts.expiresAtSeconds > now) {
    return KEEP('janela de entrega ainda aberta');
  }

  const windowSeconds = facts.expiresAtSeconds - facts.scheduledAtSeconds;
  if (windowSeconds < DEFAULT_RELAY_WINDOW_POLICY.fairWindowSeconds) {
    return EXPIRE('task_expired_unfair_window', 'janela curta demais para acusar o agente');
  }
  return EXPIRE(
    'task_expired_unclaimed',
    facts.attempts > 0
      ? 'reentregue e não reivindicada dentro da nova janela'
      : 'nunca reivindicada dentro de uma janela justa'
  );
}

/** Um motivo terminal acusa o agente? Usado pelo veredito da Onda 120. */
export function accusesAgent(reason: TerminalReason): boolean {
  return !NEUTRAL_TERMINAL_REASONS.includes(reason);
}
