import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Use env vars directly — they're injected by the test runner
const SUPABASE_URL =
  Deno.env.get('VITE_SUPABASE_URL') ??
  Deno.env.get('SUPABASE_URL') ??
  'https://qnjozykmaeifjqpicaue.supabase.co';
const SUPABASE_ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

function functionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

// =============================================
// Health Check
// =============================================
Deno.test('health: should return 200 with status', async () => {
  const res = await fetch(functionUrl('health'), {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertExists(body.status);
  assertExists(body.version);
  assertExists(body.checks);
  assertEquals(typeof body.uptime_check_ms, 'number');
});

// =============================================
// Analyze Image — Validation
// =============================================
Deno.test('analyze-image: should reject empty body', async () => {
  const res = await fetch(functionUrl('analyze-image'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  const body = await res.json();
  assertExists(body.error);
  await res.text().catch(() => {});
});

Deno.test('analyze-image: should reject invalid analysisType', async () => {
  const res = await fetch(functionUrl('analyze-image'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: 'https://example.com/test.jpg',
      analysisType: 'invalid_type',
    }),
  });
  assertEquals(res.status, 400);
  await res.text();
});

// =============================================
// Detect Faces — Validation
// =============================================
Deno.test('detect-faces: should reject empty body', async () => {
  const res = await fetch(functionUrl('detect-faces'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  await res.text();
});

// =============================================
// Compare Faces — Validation
// =============================================
Deno.test('compare-faces: should reject missing fields', async () => {
  const res = await fetch(functionUrl('compare-faces'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sourceImage: 'abc' }),
  });
  assertEquals(res.status, 400);
  await res.text();
});

// =============================================
// Send Telegram — Validation
// =============================================
Deno.test('send-telegram: should reject empty body', async () => {
  const res = await fetch(functionUrl('send-telegram'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  await res.text();
});

// =============================================
// Analyze License Plate — Validation
// =============================================
Deno.test('analyze-license-plate: should reject empty body', async () => {
  const res = await fetch(functionUrl('analyze-license-plate'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 400);
  await res.text();
});

// =============================================
// Admin Users — Auth Required
// =============================================
Deno.test('admin-users: should reject unauthenticated request', async () => {
  const res = await fetch(functionUrl('admin-users'), {
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.status, 401);
  await res.text();
});

// =============================================
// Check IP
// =============================================
Deno.test('check-ip: should return IP info', async () => {
  const res = await fetch(functionUrl('check-ip'), {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.status === 200 || res.status === 403, true);
  const body = await res.json();
  assertExists(body.ip);
  assertEquals(typeof body.allowed, 'boolean');
});

// =============================================
// CORS — Preflight
// =============================================
Deno.test('health: should handle OPTIONS preflight', async () => {
  const res = await fetch(functionUrl('health'), {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://837595d9-3a7f-4e37-9433-f7e4909f201a.lovableproject.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assertEquals(res.status, 200);
  assertExists(res.headers.get('access-control-allow-origin'));
  await res.text();
});
