import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  backoffFloorMs,
  classifyNetworkError,
  isRetryableKind,
  NetworkError,
  toNetworkError,
} from '../networkError.ts';

/** Fabrica um erro no formato que o undici entrega: código dentro de `cause`. */
function undiciError(code: string, message = 'fetch failed'): Error {
  const err = new Error(message);
  (err as { cause?: unknown }).cause = Object.assign(new Error(code), { code });
  return err;
}

Deno.test("abort é 'timeout' só quando o deadline foi nosso", () => {
  const abort = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
  assertEquals(classifyNetworkError(abort, { deadlineExpired: true }), 'timeout');
  // Sem deadline estourado, quem cancelou foi o chamador: nunca culpar o upstream.
  assertEquals(classifyNetworkError(abort), 'aborted');
});

Deno.test('códigos de transporte não viram timeout por engano', () => {
  assertEquals(classifyNetworkError(undiciError('ECONNREFUSED')), 'refused');
  assertEquals(classifyNetworkError(undiciError('ECONNRESET')), 'reset');
  assertEquals(classifyNetworkError(undiciError('UND_ERR_SOCKET')), 'reset');
  assertEquals(classifyNetworkError(undiciError('EPIPE')), 'reset');
  assertEquals(classifyNetworkError(undiciError('ENOTFOUND')), 'dns');
  assertEquals(classifyNetworkError(undiciError('EAI_AGAIN')), 'dns');
  assertEquals(classifyNetworkError(undiciError('UND_ERR_HEADERS_TIMEOUT')), 'timeout');
  assertEquals(classifyNetworkError(undiciError('UND_ERR_BODY_TIMEOUT')), 'timeout');
  assertEquals(classifyNetworkError(undiciError('ETIMEDOUT')), 'timeout');
  assertEquals(classifyNetworkError(undiciError('HPE_INVALID_CONSTANT')), 'protocol');
  assertEquals(classifyNetworkError(undiciError('HPE_HEADER_OVERFLOW')), 'protocol');
  assertEquals(classifyNetworkError(undiciError('ERR_TLS_CERT_ALTNAME_INVALID')), 'tls');
  assertEquals(classifyNetworkError(undiciError('CERT_HAS_EXPIRED')), 'tls');
});

Deno.test('fallback textual cobre redirect loop, TLS e corpo terminado', () => {
  assertEquals(classifyNetworkError(new Error('redirect count exceeded')), 'redirect_loop');
  assertEquals(classifyNetworkError(new Error('too many redirects')), 'redirect_loop');
  assertEquals(classifyNetworkError(new Error('certificate has expired')), 'tls');
  assertEquals(classifyNetworkError(new Error('terminated')), 'reset');
});

Deno.test('o desconhecido continua explícito (vira alerta, não silêncio)', () => {
  assertEquals(classifyNetworkError(new Error('algo muito estranho')), 'unknown');
  assertEquals(classifyNetworkError(null), 'unknown');
  assertEquals(classifyNetworkError(undefined), 'unknown');
  assertEquals(classifyNetworkError('string crua'), 'unknown');
  assertEquals(classifyNetworkError({ nao: 'é erro' }), 'unknown');
});

Deno.test('repetição: determinístico não repete, transitório repete', () => {
  for (const kind of ['timeout', 'reset', 'dns', 'refused', 'unknown'] as const) {
    assert(isRetryableKind(kind), `${kind} deveria ser repetível`);
  }
  for (const kind of ['aborted', 'protocol', 'redirect_loop', 'tls'] as const) {
    assert(!isRetryableKind(kind), `${kind} não pode ser repetido`);
  }
});

Deno.test('piso de recuo: recusado espera mais que reset', () => {
  assert(backoffFloorMs('refused') > backoffFloorMs('reset'));
  assert(backoffFloorMs('reset') > backoffFloorMs('timeout'));
  assertEquals(backoffFloorMs('timeout'), 0);
});

Deno.test('toNetworkError preserva causa e é idempotente', () => {
  const raw = undiciError('ECONNRESET');
  const wrapped = toNetworkError(raw);
  assert(wrapped instanceof NetworkError);
  assertEquals(wrapped.kind, 'reset');
  assertEquals(wrapped.retryable, true);
  assertEquals((wrapped as { cause?: unknown }).cause, raw);
  // Reclassificar um erro já classificado não pode mudar o veredito.
  assertEquals(toNetworkError(wrapped), wrapped);
  assertEquals(classifyNetworkError(wrapped, { deadlineExpired: true }), 'reset');
});

Deno.test('NetworkError de classe determinística não é marcado repetível', () => {
  const err = new NetworkError('redirect_loop', 'loop');
  assertEquals(err.retryable, false);
  assertEquals(err.name, 'NetworkError');
});
