import { describe, expect, it } from 'vitest';
import { authenticateDevice } from '@/lib/devices/deviceEnrollment';
import {
  CONNECT_SESSION_TTL_S,
  deniedResponse,
  malformedResponse,
  normalizeIp,
  parseConnectRequest,
  toAuditEntry,
  toPublicResponse,
} from '../../../supabase/functions/_shared/deviceConnect';

const CODE = 'ABCDEFGH1234';
const SECRET = 'a'.repeat(64);
const T0 = 1_700_000_000_000;

const reg = (over = {}) => ({
  deviceCode: CODE,
  status: 'active' as const,
  secretHash: 'hash-v2',
  secretVersion: 2,
  secretIssuedAt: T0,
  previousSecretHash: 'hash-v1',
  rotatedAt: T0,
  expiresAt: null,
  lastSeenAt: null,
  ...over,
});

describe('deviceConnect — porta pública', () => {
  it('toda recusa é byte a byte idêntica', () => {
    const canon = JSON.stringify(deniedResponse());
    const reasons = [
      authenticateDevice(null, { deviceCode: CODE, presentedHash: 'x', now: T0 }),
      authenticateDevice(reg({ status: 'revoked' }), { deviceCode: CODE, presentedHash: 'hash-v2', now: T0 }),
      authenticateDevice(reg({ expiresAt: T0 - 1 }), { deviceCode: CODE, presentedHash: 'hash-v2', now: T0 }),
      authenticateDevice(reg(), { deviceCode: CODE, presentedHash: 'errado', now: T0 }),
    ];
    for (const verdict of reasons) {
      expect(JSON.stringify(toPublicResponse(verdict))).toBe(canon);
      expect(toPublicResponse(verdict).status).toBe(401);
    }
  });

  it('aceitação devolve versão, aviso de segredo velho e TTL do servidor', () => {
    const v = authenticateDevice(reg(), { deviceCode: CODE, presentedHash: 'hash-v1', now: T0 + 1 });
    const res = toPublicResponse(v);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      connected: true,
      secretVersion: 1,
      secretStale: true,
      sessionTtlSeconds: CONNECT_SESSION_TTL_S,
    });
  });

  it('corpo hostil não passa e não vira resposta distinta', () => {
    expect(parseConnectRequest('texto').ok).toBe(false);
    expect(parseConnectRequest({ deviceCode: CODE }).ok).toBe(false);
    expect(parseConnectRequest({ deviceCode: CODE.toLowerCase(), secret: SECRET }).ok).toBe(false);
    expect(parseConnectRequest({ deviceCode: CODE, secret: 'curto' }).ok).toBe(false);
    expect(malformedResponse().body.connected).toBe(false);
  });

  it('descarta campos que tentam governar relógio ou prazo', () => {
    const parsed = parseConnectRequest({
      deviceCode: CODE,
      secret: SECRET,
      now: 1,
      sessionTtlSeconds: 99_999,
      status: 'active',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Object.keys(parsed.value).sort()).toEqual(['deviceCode', 'secret']);
  });

  it('trilha guarda o motivo real que a resposta esconde', () => {
    const v = authenticateDevice(reg({ status: 'revoked' }), {
      deviceCode: CODE,
      presentedHash: 'hash-v2',
      now: T0,
    });
    const entry = toAuditEntry(v, {
      registrationId: 'r1',
      userId: 'u1',
      deviceCode: CODE,
      sourceIp: '203.0.113.9, 70.41.3.18',
    });
    expect(entry.event).toBe('auth_denied');
    expect(entry.reason).toBe('revoked');
    expect(entry.source_ip).toBe('203.0.113.9');
    expect(JSON.stringify(entry)).not.toContain(SECRET);
  });

  it('IP sujo vira nulo em vez de derrubar a trilha', () => {
    expect(normalizeIp('999.1.1.1')).toBeNull();
    expect(normalizeIp("1.1.1.1'; DROP TABLE x;--")).toBeNull();
    expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    expect(normalizeIp(null)).toBeNull();
  });
});
