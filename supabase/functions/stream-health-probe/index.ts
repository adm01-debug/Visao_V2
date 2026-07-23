// Wave Shinobi 8 + Fortress 3 — Stream health prober
// Usa resolve-camera-url para obter a URL final rehidratada do cofre.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { maskSecrets } from '../_shared/maskSecrets.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROBE_TIMEOUT_MS = 5000;
const BATCH_SIZE = 50;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

async function resolveVaultUrl(camera_id: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-camera-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ camera_id, purpose: 'health' }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.url === 'string' ? body.url : null;
  } catch {
    return null;
  }
}

const log = (level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  console.log(JSON.stringify(maskSecrets({ level, fn: 'stream-health-probe', msg, ...meta, ts: new Date().toISOString() })));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: cams, error } = await supabase
      .from('cameras')
      .select('id, user_id, substream_url')
      .limit(BATCH_SIZE);
    if (error) throw error;

    const list = (cams ?? []) as Array<{
      id: string;
      user_id: string;
      substream_url: string | null;
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
      // Prioridade: substream_url (HLS/HTTP preview) > vault (rehidratada via resolve-camera-url)
      // stream_url NAO e lido diretamente — pode conter RTSP com credenciais.
      let url = isProbableStreamUrl(c.substream_url) ? c.substream_url : null;
      if (!url) {
        const revealed = await resolveVaultUrl(c.id);
        if (isProbableStreamUrl(revealed)) url = revealed;
      }
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

    const failed = rows.filter((r) => r.status === 'fail').length;
    log('info', 'probe_batch', { probed: rows.length, failed });
    return new Response(
      JSON.stringify({ probed: rows.length, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    log('error', 'probe_error', { err: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
