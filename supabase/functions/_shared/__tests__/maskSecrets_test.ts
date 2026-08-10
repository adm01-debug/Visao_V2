import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { maskSecrets, maskString } from '../maskSecrets.ts';

Deno.test('maskString oculta user:pass simples', () => {
  assertEquals(
    maskString('rtsp://admin:Secret1!@cam.local:554/live'),
    'rtsp://***:***@cam.local:554/live'
  );
});

Deno.test('maskString é robusto a @ na senha (Fortress 4)', () => {
  assertEquals(maskString('rtsp://admin:p@ssw0rd@10.0.0.1/live'), 'rtsp://***:***@10.0.0.1/live');
  assertEquals(maskString('rtsp://admin:p@ss:wo@rd@host:554/x'), 'rtsp://***:***@host:554/x');
});

Deno.test('maskString mantém URL sem credenciais', () => {
  assertEquals(maskString('http://public/live'), 'http://public/live');
  assertEquals(maskString('https://api.example.com/v1/x'), 'https://api.example.com/v1/x');
});

Deno.test('maskString mascara múltiplas URLs na mesma linha', () => {
  const s = 'primary=rtsp://a:b@h1/s sub=rtsp://c:d@h2/s open=http://x/y';
  const out = maskString(s);
  assert(!out.includes(':b@') && !out.includes(':d@'));
  assert(out.includes('://***:***@h1'));
  assert(out.includes('://***:***@h2'));
  assert(out.includes('http://x/y'));
});

Deno.test('maskString mascara query params sensíveis', () => {
  assertEquals(maskString('https://x/y?password=hunter2&z=1'), 'https://x/y?password=***&z=1');
  assertEquals(
    maskString('https://x/y?token=abc.def&apikey=xyz'),
    'https://x/y?token=***&apikey=***'
  );
});

Deno.test('maskString mascara Authorization Bearer', () => {
  assertEquals(maskString('Authorization: Bearer eyJhbGci.foo.bar'), 'Authorization: Bearer ***');
});

Deno.test('maskSecrets percorre objeto e array', () => {
  const obj = {
    level: 'info',
    urls: ['rtsp://u:p@h/1', 'http://open/2', 'rtsp://a:b@c@x/y'],
    meta: { primary: 'rtsps://a:b@x/y' },
  };
  const out = JSON.stringify(maskSecrets(obj));
  assert(!out.includes(':p@'));
  assert(!out.includes(':b@x'));
  assert(out.includes('://***:***@'));
});

Deno.test('maskSecrets redige chaves sensíveis independente do valor', () => {
  const out = maskSecrets({
    password: 'hunter2',
    token: 'abc',
    api_key: 'k',
    nested: { secret: 'x' },
  }) as Record<string, unknown>;
  assertEquals(out.password, '***');
  assertEquals(out.token, '***');
  assertEquals(out.api_key, '***');
  assertEquals((out.nested as Record<string, unknown>).secret, '***');
});

Deno.test('maskSecrets é null-safe', () => {
  assertEquals(maskSecrets(null), null);
  assertEquals(maskSecrets(undefined), undefined);
});
