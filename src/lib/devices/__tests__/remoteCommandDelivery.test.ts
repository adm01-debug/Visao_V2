import { describe, expect, it } from 'vitest';
import {
  DELIVERY_LEASE_MS,
  judgeReport,
  MAX_DELIVERY_ATTEMPTS,
  planPoll,
  toDeliveryEnvelope,
  type CommandSnapshot,
} from '@/lib/devices/remoteCommandDelivery';

const NOW = 1_800_000_000_000;

const snap = (over: Partial<CommandSnapshot> = {}): CommandSnapshot => ({
  id: 'c1',
  command: 'config.read',
  status: 'queued',
  createdAt: NOW - 60_000,
  expiresAt: NOW + 600_000,
  deliveredAt: null,
  deliveryAttempts: 0,
  ...over,
});

describe('coleta de comandos (Onda 194)', () => {
  it('entrega a ordem mais antiga viável e apenas uma por vez', () => {
    const plan = planPoll(
      [snap({ id: 'b', createdAt: NOW - 10_000 }), snap({ id: 'a', createdAt: NOW - 90_000 })],
      NOW
    );
    expect(plan.delivery?.commandId).toBe('a');
    expect(plan.decisions.filter((d) => d.action === 'deliver')).toHaveLength(1);
  });

  it('nunca entrega ordem vencida — ela morre na leitura', () => {
    const plan = planPoll([snap({ expiresAt: NOW })], NOW);
    expect(plan.delivery).toBeNull();
    expect(plan.decisions[0]).toMatchObject({ action: 'expire', reason: 'deadline_passed' });
  });

  it('o poll é a prova de presença que faltava', () => {
    const plan = planPoll([snap({ status: 'awaiting_presence' })], NOW);
    expect(plan.delivery?.reason).toBe('presence_proved');
  });

  it('empréstimo de execução impede entrega dupla', () => {
    const cmd = snap({ status: 'delivered', deliveredAt: NOW - 1_000, deliveryAttempts: 1 });
    expect(planPoll([cmd], NOW).delivery).toBeNull();
    expect(planPoll([cmd], NOW + DELIVERY_LEASE_MS)?.delivery?.action).toBe('redeliver');
  });

  it('equipamento mudo não consome reentregas para sempre', () => {
    const cmd = snap({
      status: 'delivered',
      deliveredAt: NOW - DELIVERY_LEASE_MS - 1,
      deliveryAttempts: MAX_DELIVERY_ATTEMPTS,
    });
    const plan = planPoll([cmd], NOW);
    expect(plan.delivery).toBeNull();
    expect(plan.decisions[0].action).toBe('exhaust');
  });

  it('o envelope não carrega nada além do necessário para executar', () => {
    const cmd = snap({ command: 'device.reboot' });
    const plan = planPoll([cmd], NOW);
    const env = toDeliveryEnvelope(cmd, { channel: 1 }, plan.delivery!);
    expect(env.effectful).toBe(true);
    expect(Object.keys(env).sort()).toEqual(
      ['attempt', 'command', 'commandId', 'effectful', 'expiresAt', 'payload', 'redelivered'].sort()
    );
  });
});

describe('prestação de contas (Onda 194)', () => {
  it('aceita laudo de ordem entregue dentro do prazo', () => {
    const v = judgeReport(snap({ status: 'delivered', deliveredAt: NOW - 1 }), {
      outcome: 'failed',
      now: NOW,
    });
    expect(v).toEqual({ accepted: true, nextStatus: 'failed', reason: 'reported' });
  });

  it('laudo tardio é registrado, mas não ressuscita a ordem', () => {
    const v = judgeReport(snap({ status: 'delivered', expiresAt: NOW }), {
      outcome: 'completed',
      now: NOW,
    });
    expect(v).toEqual({ accepted: false, reason: 'deadline_passed' });
  });

  it('não se presta contas de trabalho nunca recebido', () => {
    expect(judgeReport(snap({ status: 'queued' }), { outcome: 'completed', now: NOW })).toEqual({
      accepted: false,
      reason: 'never_delivered',
    });
  });

  it('ordem de outro equipamento e ordem inexistente têm a mesma resposta', () => {
    expect(judgeReport(null, { outcome: 'completed', now: NOW })).toEqual({
      accepted: false,
      reason: 'unknown_command',
    });
  });

  it('estado encerrado é encerrado', () => {
    for (const status of ['completed', 'failed', 'expired', 'cancelled'] as const) {
      expect(judgeReport(snap({ status }), { outcome: 'completed', now: NOW })).toEqual({
        accepted: false,
        reason: 'already_settled',
      });
    }
  });
});
