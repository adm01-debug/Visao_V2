// Wave Shinobi 8 — Stream health prober
// Runs periodically (via pg_cron -> pg_net) and probes camera stream URLs,
// inserting rows into public.stream_health_checks. Also flips cameras.status
// to 'offline'/'online' based on recent window.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROBE_TIMEOUT_MS = 5000;
const BATCH_SIZE = 50;

function isProbableStreamUrl(u: string | null | undefined): u is string {
  if (!u) return false;
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function probe(url: string): Promise<{ ok: boolean; status: number; elapsed: number; timeout: boolean }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    return { ok: res.ok, status: res.status, elapsed: Date.now() - started, timeout: false };
  } catch (e) {
    const timeout = (e as Error).name === 'AbortError';
    return { ok: false, status: 0, elapsed: Date.now() - started, timeout };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: cams, error } = await supabase
      .from('cameras')
      .select('id, user_id, stream_url, substream_url, hls_url')
      .limit(BATCH_SIZE);
    if (error) throw error;

    const list = (cams ?? []) as Array<{
      id: string;
      user_id: string;
      stream_url: string | null;
      substream_url: string | null;
      hls_url: string | null;
    }>;

    const rows: Array<{
      user_id: string;
      camera_id: string;
      status: 'ok' | 'fail';
      latency_ms: number;
      http_code: number;
      message: string | null;
    }> = [];

    for (const c of list) {
      const url = [c.hls_url, c.substream_url, c.stream_url].find(isProbableStreamUrl);
      if (!url) {
        rows.push({
          user_id: c.user_id,
          camera_id: c.id,
          status: 'fail',
          latency_ms: 0,
          http_code: 0,
          message: 'no_http_stream_url',
        });
        continue;
      }
      const r = await probe(url);
      const isFail = r.timeout || !r.ok || r.elapsed > PROBE_TIMEOUT_MS;
      rows.push({
        user_id: c.user_id,
        camera_id: c.id,
        status: isFail ? 'fail' : 'ok',
        latency_ms: r.elapsed,
        http_code: r.status,
        message: r.timeout ? 'timeout' : isFail ? `http_${r.status}` : null,
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('stream_health_checks').insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ probed: rows.length, failed: rows.filter((r) => r.status === 'fail').length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
