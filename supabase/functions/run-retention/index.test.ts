import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ??
  Deno.env.get('SUPABASE_URL') ??
  'https://qnjozykmaeifjqpicaue.supabase.co';

const url = `${SUPABASE_URL}/functions/v1/run-retention`;

// OPTIONS deve responder CORS
Deno.test('run-retention: OPTIONS returns CORS ok', async () => {
  const res = await fetch(url, { method: 'OPTIONS' });
  // 200 ou 204 são aceitos
  assertEquals([200, 204].includes(res.status), true, `status=${res.status}`);
  await res.text();
});

// POST sem x-retention-secret deve retornar 401
Deno.test('run-retention: rejects missing secret header', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  assertEquals(res.status, 401);
  await res.text();
});

// POST com secret errado deve retornar 401
Deno.test('run-retention: rejects wrong secret', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-retention-secret': 'definitely-wrong-secret-value',
    },
  });
  assertEquals(res.status, 401);
  await res.text();
});
