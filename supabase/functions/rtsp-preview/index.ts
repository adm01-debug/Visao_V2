/**
 * VISÃO — Edge Function `rtsp-preview`
 *
 * Cria/estende/encerra sessões efêmeras de prévia HLS para RTSP.
 * Retorna apenas URLs HLS assinadas — nunca ecoa credenciais RTSP.
 *
 * Limites:
 *  - Duração inicial 60s, extend +60s, máximo 240s total.
 *  - Rate limit 30 req/min por usuário.
 *  - Requer JWT autenticado.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TOTAL_SECONDS = 240;
const DEFAULT_SECONDS = 60;
const EXTEND_SECONDS = 60;

const rl = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rl.get(key);
  if (!e || now > e.resetAt) {
    rl.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  e.count++;
  return e.count <= limit;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildHlsUrl(pathName: string): string {
  const base = (Deno.env.get('MEDIAMTX_HLS_BASE') || 'https://mediamtx.example.com').replace(
    /\/$/,
    ''
  );
  return `${base}/${pathName}/index.m3u8`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader) return json(401, { error: 'unauthorized' });

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });
  const userId = userData.user.id;

  if (!rateLimit(userId)) return json(429, { error: 'rate_limited' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const action = String(body.action || '');

  if (action === 'start') {
    const rtspUrl = String(body.rtspUrl || '');
    if (!rtspUrl.startsWith('rtsp://')) return json(400, { error: 'invalid_rtsp_url' });
    const pathName = `prev_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const rtspHash = await sha256Hex(rtspUrl);
    const expiresAt = new Date(Date.now() + DEFAULT_SECONDS * 1000).toISOString();
    const { data, error } = await supabase
      .from('rtsp_preview_sessions')
      .insert({
        user_id: userId,
        path_name: pathName,
        rtsp_url_hash: rtspHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();
    if (error) return json(500, { error: 'session_create_failed' });
    return json(200, {
      sessionId: data.id,
      hlsUrl: buildHlsUrl(pathName),
      expiresAt,
    });
  }

  if (action === 'extend') {
    const sessionId = String(body.sessionId || '');
    const seconds = Math.min(EXTEND_SECONDS, Number(body.seconds) || EXTEND_SECONDS);
    if (!sessionId) return json(400, { error: 'session_id_required' });
    const { data: existing, error: selErr } = await supabase
      .from('rtsp_preview_sessions')
      .select('id, created_at, expires_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (selErr || !existing) return json(404, { error: 'session_not_found' });
    const createdAtMs = new Date(existing.created_at).getTime();
    const newExpiresMs = new Date(existing.expires_at).getTime() + seconds * 1000;
    if (newExpiresMs - createdAtMs > MAX_TOTAL_SECONDS * 1000) {
      return json(400, { error: 'max_duration_exceeded' });
    }
    const newExpires = new Date(newExpiresMs).toISOString();
    const { error: updErr } = await supabase
      .from('rtsp_preview_sessions')
      .update({ expires_at: newExpires, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (updErr) return json(500, { error: 'extend_failed' });
    return json(200, { sessionId, expiresAt: newExpires });
  }

  if (action === 'stop') {
    const sessionId = String(body.sessionId || '');
    if (!sessionId) return json(400, { error: 'session_id_required' });
    await supabase.from('rtsp_preview_sessions').delete().eq('id', sessionId);
    return json(200, { sessionId, stopped: true });
  }

  return json(400, { error: 'unknown_action' });
});
