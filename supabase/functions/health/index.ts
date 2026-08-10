/**
 * VISÃO — health check (público, sem auth)
 * Retorna status resumido do sistema para monitoramento externo (Pingdom, UptimeRobot).
 * Nunca expõe secrets, IDs de usuário ou dados de negócio.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Rate limit muito simples: 60 req/min por IP (evita abuso, ainda permite polling agressivo)
const store = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 60;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('system_health');
    const latency = Date.now() - t0;

    if (error) {
      return new Response(
        JSON.stringify({
          status: 'unhealthy',
          error: 'db_unreachable',
          latency_ms: latency,
          checked_at: new Date().toISOString(),
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Wave 24: last circuit-breaker transitions in the last 15 min.
    let circuits: Array<Record<string, unknown>> = [];
    try {
      const since = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data: txs } = await supabase
        .from('query_telemetry')
        .select('query_type, severity, metadata, created_at')
        .eq('operation', 'circuit_transition')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      circuits = txs ?? [];
    } catch {
      /* observability must not break /health */
    }

    const status = (data as { status?: string })?.status ?? 'unknown';
    const anyOpen = circuits.some((c) => (c.query_type as string) === 'circuit:open');
    const finalStatus = status === 'unhealthy' ? 'unhealthy' : anyOpen ? 'degraded' : status;
    const httpStatus = finalStatus === 'unhealthy' ? 503 : 200;
    return new Response(
      JSON.stringify({
        ...(data as object),
        status: finalStatus,
        circuits: { recent_transitions: circuits, any_open: anyOpen },
        latency_ms: latency,
        version: 'v24',
      }),
      {
        status: httpStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: 'internal',
        message: (err as Error).message,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
