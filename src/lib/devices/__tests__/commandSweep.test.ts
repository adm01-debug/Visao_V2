import { describe, expect, it } from 'vitest';
import {
  judgeSweep,
  planSweep,
  type SweepCandidate,
} from '@/lib/devices/commandSweep';
import { DELIVERY_LEASE_MS, MAX_DELIVERY_ATTEMPTS } from '@/lib/devices/remoteCommandDelivery';

const NOW = 1_800_000_000_000;

const cand = (over: Partial<SweepCandidate> = {}): SweepCandidate => ({
  id: 'c1',
  status: 'queued',
  expiresAt: NOW + 600_000,
  deliveredAt: null,
  deliveryAttempts: 0,
  ...over,
});

describe('varredura de ordens abandonadas (Onda 195)', () => {
  it('não toca ordem viva na fila', () => {
    expect(judgeSweep(cand(), NOW)).toEqual({ id: 'c1', reason: 'alive', nextStatus: null });
  });

  it('distingue quem venceu antes e depois da entrega', () => {
    expect(judgeSweep(cand({ expiresAt: NOW }), NOW).reason).toBe('expired_undelivered');
    expect(
      judgeSweep(cand({ status: 'delivered', expiresAt: NOW, deliveredAt: NOW - 1 }), NOW).reason,
    ).toBe('expired_in_flight');
  });

  it('prazo vence antes do empréstimo: ordem vencida está vencida', () => {
    const v = judgeSweep(
      cand({
        status: 'delivered',
        expiresAt: NOW,
        deliveredAt: NOW - 1,
        deliveryAttempts: MAX_DELIVERY_ATTEMPTS,
      }),
      NOW,
    );
    expect(v.nextStatus).toBe('expired');
  });

  it('empréstimo correndo nunca é abandono, mesmo na última tentativa', () => {
    const v = judgeSweep(
      cand({
        status: 'delivered',
        deliveredAt: NOW - DELIVERY_LEASE_MS + 1,
        deliveryAttempts: MAX_DELIVERY_ATTEMPTS,
      }),
      NOW,
    );
    expect(v).toMatchObject({ reason: 'alive', nextStatus: null });
  });

  it('empréstimo órfão com reentregas esgotadas vira falha, nunca sucesso', () => {
    const v = judgeSweep(
      cand({
        status: 'delivered',
        deliveredAt: NOW - DELIVERY_LEASE_MS,
        deliveryAttempts: MAX_DELIVERY_ATTEMPTS,
      }),
      NOW,
    );
    expect(v).toEqual({ id: 'c1', reason: 'delivery_exhausted', nextStatus: 'failed' });
  });

  it('ainda há reentrega possível: a varredura espera o poll', () => {
    const v = judgeSweep(
      cand({
        status: 'delivered',
        deliveredAt: NOW - DELIVERY_LEASE_MS * 10,
        deliveryAttempts: MAX_DELIVERY_ATTEMPTS - 1,
      }),
      NOW,
    );
    expect(v.reason).toBe('alive');
  });

  it('estado terminal é inerte', () => {
    for (const status of ['completed', 'failed', 'expired', 'cancelled'] as const) {
      expect(judgeSweep(cand({ status, expiresAt: NOW - 1 }), NOW)).toEqual({
        id: 'c1',
        reason: 'settled',
        nextStatus: null,
      });
    }
  });

  it('estado desconhecido não é adivinhado', () => {
    expect(judgeSweep(cand({ status: 'teleported', expiresAt: NOW - 1 }), NOW).nextStatus).toBeNull();
  });

  it('o lote adia, nunca absolve', () => {
    const list = Array.from({ length: 5 }, (_, i) => cand({ id: `x${i}`, expiresAt: NOW - 1 }));
    const plan = planSweep(list, NOW, 2);
    expect(plan.actions).toHaveLength(2);
    expect(plan.counts.expired_undelivered).toBe(5);
    expect(plan.verdicts.every((v) => v.nextStatus === 'expired')).toBe(true);
  });

  it('contabiliza todos os motivos do retrato', () => {
    const plan = planSweep(
      [
        cand({ id: 'a', expiresAt: NOW - 1 }),
        cand({ id: 'b', status: 'completed' }),
        cand({ id: 'c' }),
      ],
      NOW,
    );
    expect(plan.counts).toMatchObject({ expired_undelivered: 1, settled: 1, alive: 1 });
  });
});
