import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ??
  Deno.env.get('SUPABASE_URL') ??
  'https://qnjozykmaeifjqpicaue.supabase.co';
const SUPABASE_ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const url = `${SUPABASE_URL}/functions/v1/admin-slow-queries`;
const jsonHeaders = {
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
};

// GET/PUT/DELETE devem cair no 405
Deno.test('admin-slow-queries: rejects non-POST', async () => {
  const res = await fetch(url, { method: 'GET', headers: jsonHeaders });
  assertEquals(res.status, 405);
  await res.text();
});

// OPTIONS deve responder CORS OK
Deno.test('admin-slow-queries: OPTIONS returns CORS ok', async () => {
  const res = await fetch(url, { method: 'OPTIONS', headers: jsonHeaders });
  assertEquals(res.status, 200);
  assertExists(res.headers.get('Access-Control-Allow-Origin'));
  await res.text();
});

// POST sem Authorization deve retornar 401 (verify_jwt=true na config)
Deno.test('admin-slow-queries: rejects missing auth', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 5 }),
  });
  // Pode ser 401 (verify_jwt) ou 400 se rota rejeitar antes
  assertEquals([401, 403].includes(res.status), true, `status=${res.status}`);
  await res.text();
});

// POST autenticado como anon (não-admin) deve retornar 403
Deno.test('admin-slow-queries: rejects non-admin user', async () => {
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ limit: 5 }),
  });
  // Anon key ≠ admin. Espera 401/403 depending on JWT presence.
  assertEquals([401, 403].includes(res.status), true, `status=${res.status}`);
  await res.text();
});
