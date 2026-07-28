/**
 * Onda 194 — Espelho de servidor da regra de coleta/laudo dos comandos remotos.
 *
 * Este arquivo é o gêmeo de `src/lib/devices/remoteCommandDelivery.ts`. A regra
 * é a mesma palavra por palavra; a única diferença é que aqui o catálogo de
 * atos com efeito físico é declarado localmente, porque a função de borda não
 * importa código do `src/`. O gate `scripts/check-remote-commands.mjs` compara
 * os dois corpos e falha se divergirem.
 *
 * Ler o cabeçalho do original antes de mexer aqui: as quatro invariantes
 * (prazo antes da entrega, empréstimo de execução, teto de reentregas, fila
 * serializada) são o motivo de este código existir.
 */

export type RemoteCommandKind =
  | 'osd.open'
  | 'osd.apply'
  | 'clock.sync'
  | 'config.read'
  | 'stream.restart'
  | 'device.reboot';

/** Atos que mudam o estado físico do equipamento. */
const EFFECTFUL: ReadonlySet<RemoteCommandKind> = new Set<RemoteCommandKind>([
  'osd.apply',
  'stream.restart',
  'device.reboot',
]);

export const isEffectful = (kind: RemoteCommandKind): boolean => EFFECTFUL.has(kind);

export type CommandStatus =
  | 'queued'
  | 'awaiting_presence'
  | 'delivered'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export const TERMINAL_STATUSES: ReadonlySet<CommandStatus> = new Set<CommandStatus>([
  'completed',
  'failed',
  'expired',
  'cancelled',
]);

export const DELIVERY_LEASE_MS = 60_000;
export const MAX_DELIVERY_ATTEMPTS = 3;

export interface CommandSnapshot {
  id: string;
  command: RemoteCommandKind;
  status: CommandStatus;
  createdAt: number;
  expiresAt: number;
  deliveredAt: number | null;
  deliveryAttempts: number;
}

export type PollAction = 'deliver' | 'redeliver' | 'expire' | 'exhaust' | 'hold' | 'skip';

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
  persists: boolean;
}

export interface PollPlan {
  delivery: PollDecision | null;
  decisions: PollDecision[];
}

const decision = (
  commandId: string,
  action: PollAction,
  reason: PollReason,
  persists: boolean,
): PollDecision => ({ commandId, action, reason, persists });

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
      if (now < leaseEnd) {
        decisions.push(decision(cmd.id, 'hold', 'lease_active', false));
        headTaken = true;
        continue;
      }
      if (cmd.deliveryAttempts >= MAX_DELIVERY_ATTEMPTS) {
        decisions.push(decision(cmd.id, 'exhaust', 'delivery_exhausted', true));
        continue;
      }
      delivery = decision(cmd.id, 'redeliver', 'lease_expired', true);
      decisions.push(delivery);
      headTaken = true;
      continue;
    }

    const reason: PollReason = cmd.status === 'awaiting_presence'
      ? 'presence_proved'
      : 'first_delivery';
    delivery = decision(cmd.id, 'deliver', reason, true);
    decisions.push(delivery);
    headTaken = true;
  }

  return { delivery, decisions };
}

export type ReportedOutcome = 'completed' | 'failed';

export type ReportVerdict =
  | { accepted: true; nextStatus: 'completed' | 'failed'; reason: 'reported' }
  | {
    accepted: false;
    reason: 'unknown_command' | 'already_settled' | 'never_delivered' | 'deadline_passed';
  };

export interface ReportRequest {
  outcome: ReportedOutcome;
  now: number;
}

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

export interface DeliveryEnvelope {
  commandId: string;
  command: RemoteCommandKind;
  payload: Record<string, unknown>;
  expiresAt: string;
  attempt: number;
  redelivered: boolean;
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
