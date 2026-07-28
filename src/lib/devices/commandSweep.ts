/**
 * Onda 195 — Varredura de ordens abandonadas na fila de comandos.
 *
 * As Ondas 193 (admissão) e 194 (coleta/laudo) só agem quando alguém aparece:
 * um operador que envia, um equipamento que faz poll. O que ninguém tratou até
 * aqui é o caso em que **ninguém aparece nunca mais** — o gravador é desligado,
 * trocado ou sai da rede logo depois de receber uma ordem.
 *
 * Nesse cenário a fila mente de duas formas distintas, e é importante não
 * confundi-las:
 *
 *  A. **Ordem que venceu sem ninguém encerrar.** `expires_at` já passou, mas o
 *     estado ainda diz `queued`/`awaiting_presence`/`delivered`. A Onda 194 só
 *     encerra isso na leitura da fila; sem poll, o defunto fica no histórico
 *     com cara de vivo e o painel mostra "aguardando o equipamento" para uma
 *     ordem que nunca mais será executada.
 *
 *  B. **Empréstimo órfão com reentregas esgotadas.** A ordem foi entregue as
 *     três vezes permitidas, o último empréstimo venceu, o prazo geral ainda
 *     não. A Onda 194 diz que isso vira `failed` — mas quem aplica essa regra é
 *     o próximo poll, que nunca vem. Enquanto isso, o índice de exclusividade
 *     mantém o equipamento bloqueado para novos atos físicos: o operador tenta
 *     reiniciar e o sistema recusa por causa de um fantasma.
 *
 * O caso B é o que dói: é um bloqueio ativo causado por um equipamento morto.
 *
 * ## O que esta regra recusa a fazer
 *
 *  1. **Não encerra ordem viva.** Empréstimo ainda correndo é execução em
 *     andamento — mesmo que pareça lenta. Encerrar aí produziria dois reinícios
 *     quando o equipamento voltasse com o laudo.
 *
 *  2. **Não inventa laudo.** Fechamento por varredura nunca vira `completed`.
 *     O sistema não observou sucesso; observou ausência. `reported_at` fica
 *     nulo justamente para que o histórico distinga "o equipamento disse que
 *     falhou" de "o equipamento nunca disse nada".
 *
 *  3. **Não usa o relógio como desculpa.** O corte é sempre um instante
 *     recebido (`now`), nunca `Date.now()` interno, para que o mesmo retrato
 *     produza sempre o mesmo veredito — em teste, no espelho SQL e no cron.
 *
 *  4. **Não reabre ordem encerrada.** Estado terminal é inerte para a varredura.
 *
 * Espelho SQL: `public.sweep_device_remote_commands()`. O gate
 * `scripts/check-command-sweep.mjs` executa os mesmos casos nos dois lados.
 */

import { DELIVERY_LEASE_MS, MAX_DELIVERY_ATTEMPTS } from './remoteCommandDelivery';

/** Motivo pelo qual a varredura tocou (ou não) a ordem. */
export type SweepReason =
  /** Prazo passou e a ordem nunca chegou ao equipamento. */
  | 'expired_undelivered'
  /** Prazo passou depois da entrega, sem laudo: trabalho de destino incerto. */
  | 'expired_in_flight'
  /** Reentregas esgotadas e empréstimo órfão: o equipamento parou de responder. */
  | 'delivery_exhausted'
  /** Ordem viva — a varredura não age. */
  | 'alive'
  /** Ordem já encerrada — inerte. */
  | 'settled';

/** Estados terminais: a varredura nunca os toca. */
const TERMINAL = new Set(['completed', 'failed', 'expired', 'cancelled']);

/** Estados abertos, na ordem em que a Onda 193/194 os produz. */
const OPEN = new Set(['queued', 'awaiting_presence', 'delivered']);

export interface SweepCandidate {
  readonly id: string;
  readonly status: string;
  readonly expiresAt: number;
  readonly deliveredAt: number | null;
  readonly deliveryAttempts: number;
}

export interface SweepVerdict {
  readonly id: string;
  readonly reason: SweepReason;
  /** Estado final a gravar; `null` quando a ordem não deve ser tocada. */
  readonly nextStatus: 'expired' | 'failed' | null;
}

/**
 * Veredito de uma única ordem.
 *
 * A ordem das perguntas é semântica, não estética:
 *
 *  - Terminal primeiro: nada mais importa sobre uma ordem encerrada.
 *  - Prazo antes de empréstimo: uma ordem vencida está vencida mesmo que o
 *    empréstimo ainda corra. Ela não pode ser executada de qualquer forma
 *    (invariante I da Onda 194), então o veredito honesto é "venceu", não
 *    "está em execução".
 *  - Esgotamento por último: só faz sentido para ordem ainda dentro do prazo.
 */
export function judgeSweep(candidate: SweepCandidate, now: number): SweepVerdict {
  const { id, status, expiresAt, deliveredAt, deliveryAttempts } = candidate;

  if (TERMINAL.has(status)) return { id, reason: 'settled', nextStatus: null };

  // Estado desconhecido é tratado como inerte: a varredura é uma rotina de
  // limpeza, não o lugar para adivinhar semântica nova.
  if (!OPEN.has(status)) return { id, reason: 'settled', nextStatus: null };

  if (expiresAt <= now) {
    return {
      id,
      reason: status === 'delivered' ? 'expired_in_flight' : 'expired_undelivered',
      nextStatus: 'expired',
    };
  }

  if (status !== 'delivered') return { id, reason: 'alive', nextStatus: null };

  // Ordem entregue e dentro do prazo. Só é abandonada quando as duas condições
  // valem ao mesmo tempo: nada mais a reentregar E o empréstimo já venceu.
  // Testar só o contador fecharia ordem em plena execução na terceira tentativa.
  // Entrega sem carimbo é dado incoerente (o guard do banco a proíbe). Tratar
  // o carimbo ausente como "época zero" faria a varredura encerrar a ordem por
  // um empréstimo que nunca foi medido — a varredura não age sobre o que não
  // conseguiu observar, então esse retrato permanece vivo.
  if (deliveredAt === null) return { id, reason: 'alive', nextStatus: null };

  const leaseEnd = deliveredAt + DELIVERY_LEASE_MS;
  if (deliveryAttempts >= MAX_DELIVERY_ATTEMPTS && leaseEnd <= now) {
    return { id, reason: 'delivery_exhausted', nextStatus: 'failed' };
  }

  return { id, reason: 'alive', nextStatus: null };
}

export interface SweepPlan {
  readonly verdicts: readonly SweepVerdict[];
  /** Ordens a encerrar, já filtradas e limitadas pelo lote. */
  readonly actions: readonly SweepVerdict[];
  readonly counts: Readonly<Record<SweepReason, number>>;
}

/**
 * Plano de varredura sobre um retrato da fila.
 *
 * O lote (`limit`) protege o banco de uma varredura gigante depois de uma
 * queda longa, mas nunca altera o veredito individual: o que sobra do lote fica
 * para a próxima passada, e não vira "vivo".
 */
export function planSweep(
  candidates: readonly SweepCandidate[],
  now: number,
  limit = 500,
): SweepPlan {
  const verdicts = candidates.map((c) => judgeSweep(c, now));

  const counts: Record<SweepReason, number> = {
    expired_undelivered: 0,
    expired_in_flight: 0,
    delivery_exhausted: 0,
    alive: 0,
    settled: 0,
  };
  for (const v of verdicts) counts[v.reason] += 1;

  const actions = verdicts.filter((v) => v.nextStatus !== null).slice(0, Math.max(0, limit));
  return { verdicts, actions, counts };
}
