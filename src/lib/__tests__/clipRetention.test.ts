import { describe, it, expect } from 'vitest';
import {
  DEFAULT_POLICY,
  computeExpiryDate,
  isClipExpired,
  resolveRetentionDays,
  validatePolicy,
} from '@/lib/clipRetention';

const day = 86_400_000;

describe('clipRetention', () => {
  it('resolveRetentionDays usa override por objeto', () => {
    expect(resolveRetentionDays(DEFAULT_POLICY, 'plate')).toBe(90);
    expect(resolveRetentionDays(DEFAULT_POLICY, 'other')).toBe(14);
    expect(resolveRetentionDays(DEFAULT_POLICY)).toBe(30);
  });

  it('computeExpiryDate retorna null para clip crítico', () => {
    expect(computeExpiryDate({ createdAt: new Date(), critical: true }, DEFAULT_POLICY)).toBeNull();
  });

  it('computeExpiryDate soma dias corretamente', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const exp = computeExpiryDate({ createdAt: created, objectClass: 'plate' }, DEFAULT_POLICY)!;
    expect(exp.getTime()).toBe(created.getTime() + 90 * day);
  });

  it('isClipExpired detecta expiração', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const now60 = new Date(created.getTime() + 60 * day);
    expect(isClipExpired({ createdAt: created, objectClass: 'person' }, DEFAULT_POLICY, now60)).toBe(true);
    expect(isClipExpired({ createdAt: created, objectClass: 'plate' }, DEFAULT_POLICY, now60)).toBe(false);
  });

  it('policy com defaultDays=0 mantém indefinidamente', () => {
    const p = { defaultDays: 0 };
    expect(computeExpiryDate({ createdAt: new Date() }, p)).toBeNull();
  });

  it('validatePolicy rejeita valores inválidos', () => {
    expect(validatePolicy({ defaultDays: 30 })).toEqual([]);
    expect(validatePolicy({ defaultDays: -1 }).length).toBe(1);
    expect(validatePolicy({ defaultDays: 30, perObject: { plate: -5 } }).length).toBe(1);
  });
});
