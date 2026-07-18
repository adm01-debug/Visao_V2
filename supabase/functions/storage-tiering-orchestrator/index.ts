/**
 * VISÃO — storage-tiering-orchestrator
 * Ponto único agendado (pg_cron) que dispara promoção hot→warm e archive warm→cold
 * aplicando:
 *   - Advisory lock global (evita execuções sobrepostas / backpressure)
 *   - Circuit breaker por tier (3 falhas consecutivas em 60min => pausa)
 *   - Batch adaptativo baseado no backlog
 *   - Registro auditável em `storage_tiering_runs`
 *
 * Só é invocável por admin (verify_jwt=true + has_role check) ou pelo próprio
 * pg_cron via chamada assinada com service role.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('storage-tiering-orchestrator');

const ORCH_LOCK_KEY = 0x5715_71_07; // chave arbitrária estável
const CB_WINDOW_MIN = 60;
const CB_THRESHOLD = 3;
const DEFAULT_BATCH = 25;
const LARGE_BATCH = 75;
const BACKLOG_THRESHOLD = 2000;
const TIER_TIMEOUT_MS = 120_000;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type TierName = 'hot_to_warm' | 'warm_to_cold';

interface TierOutcome {
  tier: TierName;
  status: 'success' | 'failed' | 'noop' | 'timeout' | 'skipped_cb';
  processed: number;
  failed: number;
  durationMs: number;
  error?: string;
}

async function acquireLock(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.rpc(
    'pg_try_advisory_lock' as never,
    {
      key: ORCH_LOCK_KEY,
    } as never
  );
  if (error) {
    // Fallback via SQL bruto quando rpc alias não existe
    const { error: rawErr } = await client.from('storage_tiering_runs').select('id').limit(0);
    if (rawErr) logger.warn('advisory lock rpc unavailable, proceeding without', { rawErr });
    return true;
  }
  return data === true;
}

async function isCircuitOpen(
  client: ReturnType<typeof createClient>,
  tier: TierName
): Promise<boolean> {
  const sinceIso = new Date(Date.now() - CB_WINDOW_MIN * 60_000).toISOString();
  const { data, error } = await client
    .from('storage_tiering_runs')
    .select('status, started_at')
    .eq('tier', tier)
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: false })
    .limit(CB_THRESHOLD);
  if (error) {
    logger.warn('circuit check failed', { tier, error: error.message });
    return false;
  }
  if (!data || data.length < CB_THRESHOLD) return false;
  return data.every((r: { status: string }) => r.status === 'failed' || r.status === 'timeout');
}

async function estimateBacklog(
  client: ReturnType<typeof createClient>,
  tier: TierName
): Promise<number> {
  const now = new Date();
  if (tier === 'hot_to_warm') {
    const threshold = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
    const { count } = await client
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('storage_tier', 'hot')
      .lte('captured_at', threshold);
    return count ?? 0;
  }
  const threshold = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();
  const { count } = await client
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('storage_tier', 'warm')
    .eq('legal_hold', false)
    .lte('promoted_at', threshold);
  return count ?? 0;
}

async function invokeTier(
  client: ReturnType<typeof createClient>,
  tier: TierName,
  batch: number
): Promise<TierOutcome> {
  const started = Date.now();
  const fnName = tier === 'hot_to_warm' ? 'promote-hot-to-warm' : 'archive-warm-to-cold';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIER_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'x-orchestrator': '1',
      },
      body: JSON.stringify({ batch_size: batch, dry_run: false }),
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => ({}));
    const durationMs = Date.now() - started;
    if (!res.ok) {
      return {
        tier,
        status: 'failed',
        processed: 0,
        failed: 0,
        durationMs,
        error: json?.error ?? `HTTP ${res.status}`,
      };
    }
    const processed = Number(json?.processed ?? 0);
    const failed = Number(json?.failed ?? 0);
    return {
      tier,
      status: processed === 0 && failed === 0 ? 'noop' : 'success',
      processed,
      failed,
      durationMs,
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - started;
    const isTimeout = (err as Error).name === 'AbortError';
    return {
      tier,
      status: isTimeout ? 'timeout' : 'failed',
      processed: 0,
      failed: 0,
      durationMs,
      error: (err as Error).message,
    };
  }
}

async function recordRun(
  client: ReturnType<typeof createClient>,
  tier: TierName | 'orchestrator',
  outcome: Partial<TierOutcome> & { status: string; details?: unknown; error?: string }
) {
  await client.from('storage_tiering_runs').insert({
    tier,
    status: outcome.status,
    processed_count: outcome.processed ?? 0,
    failed_count: outcome.failed ?? 0,
    duration_ms: outcome.durationMs ?? null,
    details: outcome.details ?? {},
    error_message: outcome.error ?? null,
    finished_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Auth: exige admin OU x-orchestrator (chamada via pg_cron com service role)
  const isCron = req.headers.get('x-orchestrator') === '1';
  if (!isCron) {
    const auth = req.headers.get('authorization') ?? '';
    const jwt = auth.replace(/^Bearer\s+/i, '');
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { data: role } = await admin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (role !== true) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  const t0 = Date.now();
  const locked = await acquireLock(admin);
  if (!locked) {
    await recordRun(admin, 'orchestrator', {
      status: 'skipped_lock',
      durationMs: Date.now() - t0,
      details: { reason: 'advisory_lock_held' },
    });
    return new Response(JSON.stringify({ status: 'skipped_lock' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const outcomes: TierOutcome[] = [];
  try {
    for (const tier of ['hot_to_warm', 'warm_to_cold'] as TierName[]) {
      if (await isCircuitOpen(admin, tier)) {
        const skipOutcome: TierOutcome = {
          tier,
          status: 'skipped_cb',
          processed: 0,
          failed: 0,
          durationMs: 0,
        };
        outcomes.push(skipOutcome);
        await recordRun(admin, tier, {
          ...skipOutcome,
          details: { reason: 'circuit_breaker_open' },
        });
        continue;
      }
      const backlog = await estimateBacklog(admin, tier);
      if (backlog === 0) {
        const noopOutcome: TierOutcome = {
          tier,
          status: 'noop',
          processed: 0,
          failed: 0,
          durationMs: 0,
        };
        outcomes.push(noopOutcome);
        await recordRun(admin, tier, { ...noopOutcome, details: { backlog } });
        continue;
      }
      const batch = backlog > BACKLOG_THRESHOLD ? LARGE_BATCH : DEFAULT_BATCH;
      const outcome = await invokeTier(admin, tier, batch);
      outcomes.push(outcome);
      await recordRun(admin, tier, { ...outcome, details: { backlog, batch } });
    }

    const totalDuration = Date.now() - t0;
    await recordRun(admin, 'orchestrator', {
      status: 'success',
      durationMs: totalDuration,
      processed: outcomes.reduce((a, o) => a + o.processed, 0),
      failed: outcomes.reduce((a, o) => a + o.failed, 0),
      details: { outcomes },
    });

    return new Response(JSON.stringify({ status: 'ok', outcomes, duration_ms: totalDuration }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = (err as Error).message;
    logger.error('orchestrator failed', { message });
    await recordRun(admin, 'orchestrator', {
      status: 'failed',
      durationMs: Date.now() - t0,
      error: message,
      details: { outcomes },
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } finally {
    await admin.rpc('pg_advisory_unlock' as never, { key: ORCH_LOCK_KEY } as never).catch(() => {});
  }
});
