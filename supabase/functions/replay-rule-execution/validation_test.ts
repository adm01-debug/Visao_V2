/**
 * VISÃO — Onda 3 (Replay Excellence · Testes Deno)
 *
 * Cobre guards puros do replay-rule-execution:
 *  - Validação de payload (uuid, tipos, trimming, ausência)
 *  - Guard de sessão (ownership, encerrada, expirada, ativa)
 *  - Chave de idempotência canônica (formato estável para logs/cache)
 */
import { assertEquals, assertStrictEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildIdempotencyKey,
  evaluateSessionGuard,
  UUID_RE,
  validateReplayPayload,
} from './validation.ts';

const VALID_UUID_A = '11111111-2222-3333-4444-555555555555';
const VALID_UUID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const VALID_UUID_C = '99999999-8888-7777-6666-555555555555';

Deno.test('UUID_RE aceita v4-like e recusa lixo', () => {
  assertStrictEquals(UUID_RE.test(VALID_UUID_A), true);
  assertStrictEquals(UUID_RE.test('not-a-uuid'), false);
  assertStrictEquals(UUID_RE.test(''), false);
  assertStrictEquals(UUID_RE.test('11111111-2222-3333-4444-55555555555'), false);
});

Deno.test('validateReplayPayload — payload feliz', () => {
  const result = validateReplayPayload({
    executionId: VALID_UUID_A,
    sessionId: VALID_UUID_B,
  });
  assertStrictEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, {
      executionId: VALID_UUID_A,
      sessionId: VALID_UUID_B,
    });
  }
});

Deno.test('validateReplayPayload — trima espaços laterais', () => {
  const result = validateReplayPayload({
    executionId: `  ${VALID_UUID_A}  `,
    sessionId: `\t${VALID_UUID_B}\n`,
  });
  assertStrictEquals(result.ok, true);
});

Deno.test('validateReplayPayload — rejeita executionId ausente/lixo', () => {
  for (const bad of [undefined, null, '', '   ', 'abc', 123, {}]) {
    const r = validateReplayPayload({
      executionId: bad as unknown,
      sessionId: VALID_UUID_B,
    });
    assertStrictEquals(r.ok, false);
    if (!r.ok) {
      assertStrictEquals(r.status, 400);
      assertStrictEquals(r.error, 'executionId inválido');
    }
  }
});

Deno.test('validateReplayPayload — rejeita sessionId ausente/lixo', () => {
  for (const bad of [undefined, null, '', 'not-uuid', 42]) {
    const r = validateReplayPayload({
      executionId: VALID_UUID_A,
      sessionId: bad as unknown,
    });
    assertStrictEquals(r.ok, false);
    if (!r.ok) assertStrictEquals(r.error, 'sessionId inválido');
  }
});

Deno.test('validateReplayPayload — body totalmente ausente', () => {
  const r = validateReplayPayload(null);
  assertStrictEquals(r.ok, false);
});

Deno.test('evaluateSessionGuard — sessão inexistente', () => {
  const r = evaluateSessionGuard(null, 'user-1');
  assertStrictEquals(r.ok, false);
  if (!r.ok) assertStrictEquals(r.status, 404);
});

Deno.test('evaluateSessionGuard — cross-tenant → 404 (não vaza existência)', () => {
  const r = evaluateSessionGuard(
    {
      id: VALID_UUID_A,
      user_id: 'attacker',
      ended_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    'victim'
  );
  assertStrictEquals(r.ok, false);
  if (!r.ok) {
    assertStrictEquals(r.status, 404);
    assertStrictEquals(r.error, 'Sessão não encontrada');
  }
});

Deno.test('evaluateSessionGuard — sessão encerrada → 409', () => {
  const r = evaluateSessionGuard(
    {
      id: VALID_UUID_A,
      user_id: 'u',
      ended_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    'u'
  );
  assertStrictEquals(r.ok, false);
  if (!r.ok) assertStrictEquals(r.status, 409);
});

Deno.test('evaluateSessionGuard — sessão expirada → 409', () => {
  const now = Date.parse('2026-07-22T12:00:00Z');
  const r = evaluateSessionGuard(
    {
      id: VALID_UUID_A,
      user_id: 'u',
      ended_at: null,
      expires_at: new Date(now - 1_000).toISOString(),
    },
    'u',
    now
  );
  assertStrictEquals(r.ok, false);
  if (!r.ok) {
    assertStrictEquals(r.status, 409);
    assertStrictEquals(r.error, 'Sessão de Modo Teste expirada');
  }
});

Deno.test('evaluateSessionGuard — sessão ativa passa', () => {
  const now = Date.parse('2026-07-22T12:00:00Z');
  const r = evaluateSessionGuard(
    {
      id: VALID_UUID_A,
      user_id: 'u',
      ended_at: null,
      expires_at: new Date(now + 5 * 60_000).toISOString(),
    },
    'u',
    now
  );
  assertStrictEquals(r.ok, true);
});

Deno.test('evaluateSessionGuard — expires_at nulo é aceito (sem TTL)', () => {
  const r = evaluateSessionGuard(
    { id: VALID_UUID_A, user_id: 'u', ended_at: null, expires_at: null },
    'u'
  );
  assertStrictEquals(r.ok, true);
});

Deno.test('buildIdempotencyKey — formato canônico e determinístico', () => {
  const k1 = buildIdempotencyKey('u', VALID_UUID_B, VALID_UUID_A);
  const k2 = buildIdempotencyKey('u', VALID_UUID_B, VALID_UUID_A);
  assertStrictEquals(k1, k2);
  assertStrictEquals(k1, `replay:u:${VALID_UUID_B}:${VALID_UUID_A}`);
});

Deno.test('buildIdempotencyKey — muda com qualquer campo distinto', () => {
  const base = buildIdempotencyKey('u', VALID_UUID_B, VALID_UUID_A);
  const diffUser = buildIdempotencyKey('v', VALID_UUID_B, VALID_UUID_A);
  const diffSession = buildIdempotencyKey('u', VALID_UUID_C, VALID_UUID_A);
  const diffExec = buildIdempotencyKey('u', VALID_UUID_B, VALID_UUID_C);
  assertStrictEquals(base === diffUser, false);
  assertStrictEquals(base === diffSession, false);
  assertStrictEquals(base === diffExec, false);
});
