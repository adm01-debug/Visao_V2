import { describe, expect, it } from 'vitest';
import {
  ROTATION_GRACE_MS,
  authenticateDevice,
  isWellFormedCode,
  revokeDevice,
  rotateSecret,
  silenceMs,
  type DeviceRegistration,
} from '@/lib/devices/deviceEnrollment';

const CODE = 'ABCDEFGH1234';
const T0 = 1_700_000_000_000;

const reg = (over: Partial<DeviceRegistration> = {}): DeviceRegistration => ({
  deviceCode: CODE,
  status: 'active',
  secretHash: 'hash-v2',
  secretVersion: 2,
  secretIssuedAt: T0,
  previousSecretHash: 'hash-v1',
  rotatedAt: T0,
  expiresAt: null,
  lastSeenAt: T0 - 60_000,
  ...over,
});

describe('deviceEnrollment — conexão por registro', () => {
  it('aceita o segredo vigente e registra prova de vida', () => {
    const v = authenticateDevice(reg(), {
      deviceCode: CODE,
      presentedHash: 'hash-v2',
      now: T0 + 5,
    });
    expect(v.outcome).toBe('accepted');
    expect(v.usedGrace).toBe(false);
    expect(v.registration?.lastSeenAt).toBe(T0 + 5);
  });

  it('aceita o segredo anterior só dentro da graça', () => {
    const inside = authenticateDevice(reg(), {
      deviceCode: CODE,
      presentedHash: 'hash-v1',
      now: T0 + ROTATION_GRACE_MS,
    });
    expect(inside.outcome).toBe('accepted');
    expect(inside.usedGrace).toBe(true);

    const outside = authenticateDevice(reg(), {
      deviceCode: CODE,
      presentedHash: 'hash-v1',
      now: T0 + ROTATION_GRACE_MS + 1,
    });
    expect(outside.outcome).toBe('denied');
    expect(outside.reason).toBe('grace_window_closed');
  });

  it('revogação vence segredo correto e apaga a graça', () => {
    const dead = revokeDevice(reg());
    expect(dead.previousSecretHash).toBeNull();
    const v = authenticateDevice(dead, { deviceCode: CODE, presentedHash: 'hash-v2', now: T0 + 1 });
    expect(v.reason).toBe('revoked');
    expect(revokeDevice(dead)).toBe(dead);
  });

  it('prazo vencido recusa mesmo com status ativo', () => {
    const v = authenticateDevice(reg({ expiresAt: T0 + 10 }), {
      deviceCode: CODE,
      presentedHash: 'hash-v2',
      now: T0 + 10,
    });
    expect(v.reason).toBe('expired');
  });

  it('relógio antes da emissão nunca aceita', () => {
    const v = authenticateDevice(reg(), {
      deviceCode: CODE,
      presentedHash: 'hash-v2',
      now: T0 - 1,
    });
    expect(v.reason).toBe('clock_anomaly');
  });

  it('recusa não move a prova de vida', () => {
    const before = reg();
    const v = authenticateDevice(before, {
      deviceCode: CODE,
      presentedHash: 'errado',
      now: T0 + 9,
    });
    expect(v.reason).toBe('bad_secret');
    expect(v.registration?.lastSeenAt).toBe(before.lastSeenAt);
  });

  it('dispositivo inexistente e segredo errado têm o mesmo veredito público', () => {
    const unknown = authenticateDevice(null, { deviceCode: CODE, presentedHash: 'x', now: T0 + 1 });
    const wrong = authenticateDevice(reg(), { deviceCode: CODE, presentedHash: 'x', now: T0 + 1 });
    expect(unknown.outcome).toBe(wrong.outcome);
    expect(unknown.reason).not.toBe(wrong.reason);
  });

  it('valida o formato do código de registro', () => {
    expect(isWellFormedCode(CODE)).toBe(true);
    expect(isWellFormedCode('abcdefgh1234')).toBe(false);
    expect(isWellFormedCode('CURTO')).toBe(false);
  });

  it('rotação recusa segredo repetido e dispositivo revogado', () => {
    expect(rotateSecret({ registration: reg(), nextSecretHash: 'hash-v2', now: T0 + 1 }).ok).toBe(
      false
    );
    expect(
      rotateSecret({ registration: revokeDevice(reg()), nextSecretHash: 'novo', now: T0 + 1 }).ok
    ).toBe(false);
    const rot = rotateSecret({ registration: reg(), nextSecretHash: 'hash-v3', now: T0 + 1 });
    expect(rot.ok && rot.registration.secretVersion).toBe(3);
  });

  it('silêncio faz clamp em zero e é desconhecido sem contato', () => {
    expect(silenceMs(reg({ lastSeenAt: null }), T0)).toBeNull();
    expect(silenceMs(reg({ lastSeenAt: T0 }), T0 - 5_000)).toBe(0);
  });
});
