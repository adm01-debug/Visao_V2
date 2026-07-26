import { describe, it, expect } from 'vitest';
import {
  planLease,
  backoffSeconds,
  accusesAgent,
  DEFAULT_RELAY_LEASE_POLICY as P,
  type LeaseFacts,
} from '../relayLease';

const base: LeaseFacts = {
  status: 'in_progress',
  nowSeconds: 100,
  expiresAtSeconds: 600,
  scheduledAtSeconds: 0,
  leaseExpiresAtSeconds: 50,
  attempts: 1,
};

describe('relayLease — Onda 121', () => {
  it('nunca reentrega tarefa com lease vigente (I1)', () => {
    const plan = planLease({ ...base, leaseExpiresAtSeconds: 200 });
    expect(plan.action).toBe('keep');
  });

  it('trata lease ausente como vencido para não criar tarefa zumbi', () => {
    const plan = planLease({ ...base, leaseExpiresAtSeconds: null });
    expect(plan.action).toBe('requeue');
  });

  it('reentrega com recuo e janela justa (I4)', () => {
    const plan = planLease(base);
    expect(plan.action).toBe('requeue');
    expect(plan.nextScheduledAtSeconds! - base.nowSeconds).toBe(backoffSeconds(1));
    expect(plan.nextExpiresAtSeconds! - plan.nextScheduledAtSeconds!).toBe(P.minWindowSeconds);
  });

  it('para no teto de tentativas (I2)', () => {
    const plan = planLease({ ...base, attempts: P.maxAttempts });
    expect(plan.action).toBe('expire');
    expect(plan.reason).toBe('task_expired_attempts_exhausted');
    expect(accusesAgent(plan.reason!)).toBe(true);
  });

  it('encerra sem acusar o agente quando o prazo final não comporta nova janela (I3, I6)', () => {
    const plan = planLease({ ...base, nowSeconds: P.hardDeadlineSeconds - 10 });
    expect(plan.reason).toBe('task_expired_deadline');
    expect(accusesAgent('task_expired_deadline')).toBe(false);
  });

  it('recuo é monotônico e limitado (I5)', () => {
    const seq = [1, 2, 3, 4, 5, 10].map((n) => backoffSeconds(n));
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
    expect(Math.max(...seq)).toBeLessThanOrEqual(P.backoffMaxSeconds);
  });

  it('é idempotente sobre o mesmo estado (I7)', () => {
    expect(planLease(base)).toEqual(planLease(base));
  });

  it('classifica pendente vencida conforme a justiça da janela (Onda 119)', () => {
    expect(
      planLease({ ...base, status: 'pending', scheduledAtSeconds: 0, expiresAtSeconds: 30, nowSeconds: 40 }).reason,
    ).toBe('task_expired_unfair_window');
    expect(
      planLease({ ...base, status: 'pending', scheduledAtSeconds: 0, expiresAtSeconds: 90, nowSeconds: 100 }).reason,
    ).toBe('task_expired_unclaimed');
  });

  it('mantém pendente com janela aberta', () => {
    expect(planLease({ ...base, status: 'pending', nowSeconds: 10, expiresAtSeconds: 600 }).action).toBe('keep');
  });
});
