/**
 * Onda 194 — Coleta e prestação de contas dos comandos remotos.
 *
 * A Onda 193 respondeu "esta ordem pode entrar na fila?". Esta onda responde
 * as duas perguntas seguintes, que são de natureza bem diferente:
 *
 *   1. **Coleta** — o equipamento acordou e pergunta "tem algo para mim?".
 *   2. **Prestação de contas** — o equipamento executou e diz "terminou assim".
 *
 * A tentação é tratar isso como um simples `SELECT ... WHERE status='queued'`.
 * Seria errado por quatro motivos, e cada um deles virou invariante aqui:
 *
 *  I.  **Prazo vence antes da entrega.** Uma ordem cujo prazo passou nunca é
 *      entregue, mesmo que ninguém a tenha encerrado ainda. Reiniciar um
 *      gravador porque a ordem ficou 40 minutos parada na fila é pior do que
 *      não reiniciar. A leitura da fila encerra o defunto em vez de servi-lo.
 *
 *  II. **Entregar não é executar.** Uma ordem já entregue continua entregue por
 *      um empréstimo (`DELIVERY_LEASE_MS`). Enquanto o empréstimo corre, a fila
 *      não oferece nada — nem a mesma ordem, nem a próxima. Sem isso, dois
 *      polls seguidos de um equipamento lento produziriam dois reinícios.
 *
 *  III.**Reentrega tem fim.** Depois do empréstimo, a ordem volta a ser
 *      oferecida — mas no máximo `MAX_DELIVERY_ATTEMPTS` vezes. Um equipamento
 *      que busca e nunca reporta está quebrado; insistir para sempre esconde o
 *      defeito atrás de uma fila que parece viva.
 *
 *  IV. **A fila é serializada por registro.** Um poll devolve no máximo uma
 *      ordem. Ordem é ato físico no equipamento; paralelizar OSD com reinício
 *      é convidar o indefinido.
 *
 * E uma regra sobre honestidade do laudo: **estado encerrado é encerrado**. Um
 * laudo que chega depois do prazo não ressuscita a ordem; ele é registrado como
 * fato observado, mas o veredito continua "venceu". A alternativa — aceitar o
 * laudo tardio — faria o histórico dizer que uma ordem expirada foi cumprida,
 * e o operador perderia a única evidência de que a rede estava lenta.
 *
 * Este módulo é puro: recebe o retrato da fila e o instante, devolve decisões.
 * Nenhuma E/S, nenhum relógio próprio. O espelho byte a byte vive em
 * `supabase/functions/_shared/remoteCommandDelivery.ts`.
 */

import type { RemoteCommandKind } from './remoteCommandAdmission';

/**
 * Atos com efeito físico observável no equipamento.
 *
 * Declarado aqui (e não importado em tempo de execução) porque este módulo é
 * carregado tanto pelo app quanto pelas simulações e pelo espelho de servidor,
 * que não compartilham resolvedor de módulo. O gate
 * `scripts/check-command-delivery.mjs` compara este conjunto com o do espelho e
 * com o catálogo da Onda 193 — divergência falha o build.
 */
const EFFECTFUL: ReadonlySet<RemoteCommandKind> = new Set<RemoteCommandKind>([
  'osd.apply',
  'clock.sync',
  'stream.restart',
  'device.reboot',
]);

export const isEffectful = (kind: RemoteCommandKind): boolean => EFFECTFUL.has(kind);

/** Estados possíveis de uma ordem na fila (espelho do CHECK da tabela). */
export type CommandStatus =
  | 'queued'
  | 'awaiting_presence'
  | 'delivered'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

/** Estados dos quais nada mais se move. */
export const TERMINAL_STATUSES: ReadonlySet<CommandStatus> = new Set<CommandStatus>([
  'completed',
  'failed',
  'expired',
  'cancelled',
]);

/**
 * Empréstimo de entrega: por quanto tempo uma ordem entregue é considerada
 * "em execução" antes de voltar a ser oferecida.
 *
 * 60s é escolha declarada, não medida: é maior que o pior caso observado de
 * reinício de stream e menor que o menor prazo admissível de ordem (1 minuto
 * na Onda 193), de modo que nenhuma ordem consegue esgotar tentativas antes de
 * vencer por prazo — o vencimento sempre chega primeiro ou junto.
 */
export const DELIVERY_LEASE_MS = 60_000;

/** Quantas vezes a mesma ordem pode ser oferecida antes de ser dada como perdida. */
export const MAX_DELIVERY_ATTEMPTS = 3;

/** Retrato de uma ordem, do jeito que a fila a conhece. */
export interface CommandSnapshot {
  id: string;
  command: RemoteCommandKind;
  status: CommandStatus;
  /** Instante de criação — define a ordem de atendimento (FIFO estrito). */
  createdAt: number;
  /** Prazo declarado no ato da admissão. Nunca recalculado. */
  expiresAt: number;
  /** Última entrega efetiva, se houve. */
  deliveredAt: number | null;
  /** Quantas vezes já foi oferecida. */
  deliveryAttempts: number;
}

/** O que a leitura da fila resolveu fazer com uma ordem. */
export type PollAction =
  /** Primeira entrega de uma ordem que estava na fila. */
  | 'deliver'
  /** Nova oferta de uma ordem cujo empréstimo venceu sem laudo. */
  | 'redeliver'
  /** Prazo passou: a ordem morre sem sair da fila. */
  | 'expire'
  /** Tentativas esgotadas: a ordem é dada como perdida. */
  | 'exhaust'
  /** Empréstimo corrente: nada é oferecido neste poll. */
  | 'hold'
  /** Ordem que não participa desta rodada. */
  | 'skip';

export type PollReason =
  | 'first_delivery'
  | 'presence_proved'
  | 'lease_expired'
  | 'deadline_passed'
  | 'delivery_exhausted'
  | 'lease_active'
  | 'already_settled'
  | 'behind_head';

export interface PollDecision {
  commandId: string;
  action: PollAction;
  reason: PollReason;
  /** Verdadeiro quando a decisão precisa virar escrita no banco. */
  persists: boolean;
}

export interface PollPlan {
  /** A única ordem a ser entregue nesta rodada, se houver. */
  delivery: PollDecision | null;
  /** Encerramentos e adiamentos observados durante a varredura. */
  decisions: PollDecision[];
}

const decision = (
  commandId: string,
  action: PollAction,
  reason: PollReason,
  persists: boolean,
): PollDecision => ({ commandId, action, reason, persists });

/**
 * Planeja um poll do equipamento.
 *
 * A varredura é completa (toda ordem é julgada, para que vencidas morram mesmo
 * estando atrás de outras na fila), mas a entrega é única: a primeira ordem
 * viável em ordem de criação. Se a cabeça da fila está sob empréstimo, o poll
 * volta de mãos vazias — a fila não pula a vez de ninguém.
 */
export function planPoll(commands: readonly CommandSnapshot[], now: number): PollPlan {
  const ordered = [...commands].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt - b.createdAt
  );

  const decisions: PollDecision[] = [];
  let delivery: PollDecision | null = null;
  let headTaken = false;

  for (const cmd of ordered) {
    if (TERMINAL_STATUSES.has(cmd.status)) {
      decisions.push(decision(cmd.id, 'skip', 'already_settled', false));
      continue;
    }

    // Invariante I: prazo vence antes de qualquer entrega, inclusive reentrega.
    if (cmd.expiresAt <= now) {
      decisions.push(decision(cmd.id, 'expire', 'deadline_passed', true));
      continue;
    }

    if (headTaken) {
      decisions.push(decision(cmd.id, 'skip', 'behind_head', false));
      continue;
    }

    if (cmd.status === 'delivered') {
      const leaseEnd = (cmd.deliveredAt ?? cmd.createdAt) + DELIVERY_LEASE_MS;
      // Invariante II: entregar não é executar.
      if (now < leaseEnd) {
        decisions.push(decision(cmd.id, 'hold', 'lease_active', false));
        headTaken = true;
        continue;
      }
      // Invariante III: reentrega tem fim.
      if (cmd.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS) {
        decisions.push(decision(cmd.id, 'exhaust', 'delivery_exhausted', true));
        continue;
      }
      delivery = decision(cmd.id, 'redeliver', 'lease_expired', true);
      decisions.push(delivery);
      headTaken = true;
      continue;
    }

    // `awaiting_presence` existia justamente à espera deste poll: o pedido de
    // trabalho é, ele próprio, a prova de presença que faltava.
    const reason: PollReason = cmd.status === 'awaiting_presence'
      ? 'presence_proved'
      : 'first_delivery';
    delivery = decision(cmd.id, 'deliver', reason, true);
    decisions.push(delivery);
    headTaken = true;
  }

  return { delivery, decisions };
}

/** Resultado que o equipamento afirma ter obtido. */
export type ReportedOutcome = 'completed' | 'failed';

export type ReportVerdict =
  /** Laudo aceito: a ordem passa ao estado terminal informado. */
  | { accepted: true; nextStatus: 'completed' | 'failed'; reason: 'reported' }
  /** Laudo recusado: a ordem não muda: */
  | {
    accepted: false;
    reason:
      /** Nenhuma ordem com esse identificador pertence a este equipamento. */
      | 'unknown_command'
      /** Já encerrada — laudo vira registro, nunca ressurreição. */
      | 'already_settled'
      /** Nunca foi entregue: não se presta contas de trabalho não recebido. */
      | 'never_delivered'
      /** Prazo passou entre a entrega e o laudo. */
      | 'deadline_passed';
  };

export interface ReportRequest {
  outcome: ReportedOutcome;
  now: number;
}

/**
 * Julga a prestação de contas.
 *
 * `command === null` cobre tanto "identificador inexistente" quanto "pertence a
 * outro equipamento": quem chama resolve a posse antes e passa `null` nos dois
 * casos, para que o julgamento não consiga distinguir — e portanto não consiga
 * vazar a distinção.
 */
export function judgeReport(
  command: CommandSnapshot | null,
  request: ReportRequest,
): ReportVerdict {
  if (command === null) return { accepted: false, reason: 'unknown_command' };
  if (TERMINAL_STATUSES.has(command.status)) {
    return { accepted: false, reason: 'already_settled' };
  }
  if (command.status !== 'delivered') {
    return { accepted: false, reason: 'never_delivered' };
  }
  if (command.expiresAt <= request.now) {
    return { accepted: false, reason: 'deadline_passed' };
  }
  return { accepted: true, nextStatus: request.outcome, reason: 'reported' };
}

/**
 * Corpo entregue ao equipamento.
 *
 * Só o necessário para executar: identificador (para o laudo e para dedup no
 * próprio equipamento), verbo, carga e prazo. Nada de dono, nada de trilha,
 * nada de quem pediu — o equipamento não precisa e não deve saber.
 */
export interface DeliveryEnvelope {
  commandId: string;
  command: RemoteCommandKind;
  payload: Record<string, unknown>;
  expiresAt: string;
  attempt: number;
  /** Avisa que o mesmo ato já foi oferecido antes: o equipamento deve deduplicar. */
  redelivered: boolean;
  /** Ato com efeito físico observável — o equipamento trata com cautela extra. */
  effectful: boolean;
}

export function toDeliveryEnvelope(
  snapshot: CommandSnapshot,
  payload: Record<string, unknown>,
  plan: PollDecision,
): DeliveryEnvelope {
  return {
    commandId: snapshot.id,
    command: snapshot.command,
    payload,
    expiresAt: new Date(snapshot.expiresAt).toISOString(),
    attempt: snapshot.deliveryAttempts + 1,
    redelivered: plan.action === 'redeliver',
    effectful: isEffectful(snapshot.command),
  };
}
