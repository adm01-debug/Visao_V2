/**
 * VISÃO — Onda 3 (Replay Excellence · Testes)
 *
 * Guards puros e reutilizáveis do fluxo de replay. Isolados em um módulo
 * próprio para permitir testes Deno determinísticos sem stubar Supabase.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReplayPayload {
  executionId?: unknown;
  sessionId?: unknown;
}

export interface ValidatedReplay {
  executionId: string;
  sessionId: string;
}

export type ValidationError = { ok: false; status: 400; error: string };

export function validateReplayPayload(
  body: ReplayPayload | null | undefined
): { ok: true; value: ValidatedReplay } | ValidationError {
  const executionId = typeof body?.executionId === 'string' ? body.executionId.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';

  if (!executionId || !UUID_RE.test(executionId)) {
    return { ok: false, status: 400, error: 'executionId inválido' };
  }
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return { ok: false, status: 400, error: 'sessionId inválido' };
  }
  return { ok: true, value: { executionId, sessionId } };
}

export interface SessionRow {
  id: string;
  user_id: string;
  ended_at: string | null;
  expires_at: string | null;
}

export type SessionGuardResult = { ok: true } | { ok: false; status: 404 | 409; error: string };

export function evaluateSessionGuard(
  session: SessionRow | null,
  userId: string,
  now: number = Date.now()
): SessionGuardResult {
  if (!session || session.user_id !== userId) {
    return { ok: false, status: 404, error: 'Sessão não encontrada' };
  }
  if (session.ended_at) {
    return {
      ok: false,
      status: 409,
      error: 'Sessão de Modo Teste já encerrada',
    };
  }
  if (session.expires_at && new Date(session.expires_at).getTime() < now) {
    return { ok: false, status: 409, error: 'Sessão de Modo Teste expirada' };
  }
  return { ok: true };
}

export function buildIdempotencyKey(
  userId: string,
  sessionId: string,
  executionId: string
): string {
  return `replay:${userId}:${sessionId}:${executionId}`;
}
