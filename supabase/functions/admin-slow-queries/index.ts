/**
 * VISÃO Wave 27 — Admin endpoint: slowest queries from pg_stat_statements.
 * Security: requires authenticated admin (has_role check via user-scoped
 * Supabase client), then invokes RPC via SUPABASE_SERVICE_ROLE_KEY.
 * Rate-limited to 10 req/min per admin user.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const rlStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rlStore.get(key);
  if (!e || now > e.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  e.count++;
  return e.count <= limit;
}

function clampLimit(v: unknown): number {
  const n = Number.parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(100, Math.max(1, n));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify admin via user-scoped client
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: isAdmin } = await userClient.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!rateLimit(user.id)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  let body: { limit?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const _limit = clampLimit(body?.limit);

  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data, error } = await admin.rpc('get_slow_queries', { _limit });
  if (error) {
    return new Response(JSON.stringify({ error: 'rpc_failed', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ generated_at: new Date().toISOString(), limit: _limit, rows: data ?? [] }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
