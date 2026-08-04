// Edge Function: validate-rtsp-stream
// Handshake RTSP puro para medir latência/jitter, detectar codec e sugerir ajustes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { checkRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { maskSecrets } from '../_shared/maskSecrets.ts';
import {
  assertSafeHostname,
  describeOnce,
  isPrivateIp,
  optionsSample,
  parseRtspUrl,
  stats,
} from './rtspClient.ts';
import { buildSuggestions, computeScore } from './suggestions.ts';
import { maybeAlertCriticalScore } from './criticalAlert.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const bodySchema = z.union([
  z.object({
    camera_id: z.string().uuid(),
    target: z.enum(['primary', 'substream']).default('primary'),
    samples: z.number().int().min(1).max(10).default(5),
  }),
  z.object({
    rtsp_url: z
      .string()
      .min(8)
      .max(2048)
      .regex(/^rtsps?:\/\//i),
    samples: z.number().int().min(1).max(10).default(5),
  }),
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const log = (level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  console.log(
    JSON.stringify(
      maskSecrets({
        level,
        fn: 'validate-rtsp-stream',
        msg,
        ...meta,
        ts: new Date().toISOString(),
      })
    )
  );
};

async function resolveVaultUrl(
  cameraId: string,
  target: 'primary' | 'substream'
): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-camera-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ camera_id: cameraId, purpose: 'validate', target }),
    });
    if (!res.ok) {
      await res.text();
      return null;
    }
    const j = await res.json();
    return typeof j.url === 'string' ? j.url : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const rl = checkRateLimit(req, RATE_LIMITS.ai, 'validate-rtsp', cors);
  if (!rl.allowed) return rl.response;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  // Modo interno (scheduler / cron): confia em SERVICE_ROLE + header x-internal-invoke
  const isInternal =
    req.headers.get('x-internal-invoke') === '1' && authHeader === `Bearer ${SERVICE}`;
  let userId: string;
  if (isInternal) {
    userId = req.headers.get('x-internal-user-id') ?? '';
    if (!userId) return json({ error: 'unauthorized' }, 401);
  } else {
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    userId = userData.user.id;
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    return json({ error: 'invalid_input', details: (e as Error).message }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  let rtspUrl: string | null = null;
  let target: 'primary' | 'substream' | 'inline' = 'inline';
  let cameraId: string | null = null;
  let hasSubstream = false;

  if ('camera_id' in parsed) {
    cameraId = parsed.camera_id;
    target = parsed.target;
    // Ownership check via user_id
    const { data: cam, error } = await admin
      .from('cameras')
      .select('id, user_id, substream_url, substream_enabled')
      .eq('id', cameraId)
      .maybeSingle();
    if (error || !cam || cam.user_id !== userId) {
      return json({ error: 'camera_not_found' }, 404);
    }
    hasSubstream = Boolean(cam.substream_url || cam.substream_enabled);
    if (target === 'substream' && cam.substream_url) {
      rtspUrl = cam.substream_url;
    } else {
      rtspUrl = await resolveVaultUrl(cameraId, target);
    }
    if (!rtspUrl) return json({ error: 'url_unavailable', target }, 424);
    // Audit
    await admin
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'validate_rtsp',
        resource_type: 'camera',
        resource_id: cameraId,
        metadata: { target, samples: parsed.samples },
      })
      .then(
        () => null,
        () => null
      );
  } else {
    rtspUrl = parsed.rtsp_url;
    target = 'inline';
  }

  let p;
  try {
    p = parseRtspUrl(rtspUrl!);
    assertSafeHostname(p.hostname);
  } catch (e) {
    return json({ error: 'invalid_url', message: (e as Error).message }, 400);
  }

  const warnings: string[] = [];
  if (isPrivateIp(p.hostname)) {
    warnings.push(
      'Host em rede privada. O teste corre a partir dos servidores VISÃO — só passa se houver VPN/port-forward público.'
    );
  }

  // Coleta N amostras OPTIONS
  const samples = [];
  const N = parsed.samples ?? 5;
  for (let i = 0; i < N; i++) {
    samples.push(await optionsSample(p, i + 1));
  }
  const s = stats(samples);
  const anyOk = samples.some((x) => x.ok);
  const firstFail = samples.find((x) => !x.ok);

  // DESCRIBE 1x (só se pelo menos um OPTIONS respondeu, para não gastar)
  const describe = anyOk
    ? await describeOnce(p, N + 10)
    : {
        ok: false,
        status: firstFail?.status ?? 0,
        authMethod: 'none' as const,
        codec: null,
        resolution: null,
        fps: null,
        fpsSource: null,
        resolutionSource: null,
      };

  const score = computeScore({
    ok: anyOk,
    latencyAvg: s.avg,
    jitter: s.jitter,
    lossPct: s.lossPct,
  });

  const suggestions = buildSuggestions({
    ok: anyOk,
    timeout: !anyOk && Boolean(firstFail?.timeout),
    httpStatus: firstFail?.status ?? describe.status,
    latencyAvg: s.avg,
    jitter: s.jitter,
    lossPct: s.lossPct,
    codec: describe.codec,
    resolution: describe.resolution,
    fps: describe.fps,
    fpsSource: describe.fpsSource,
    resolutionSource: describe.resolutionSource,
    authMethod: describe.authMethod,
    hasSubstream,
    target,
  });

  // Persistência apenas no modo A (camera_id)
  if (cameraId) {
    const row = {
      user_id: userId,
      camera_id: cameraId,
      status: anyOk ? 'ok' : 'fail',
      latency_ms: s.avg,
      http_code: describe.status || firstFail?.status || 0,
      message: anyOk
        ? null
        : firstFail?.timeout
          ? 'timeout'
          : `handshake_${firstFail?.status ?? 0}`,
      score,
    };
    await admin
      .from('stream_health_checks')
      .insert(row)
      .then(
        () => null,
        () => null
      );
    // Alerta automático via Telegram/Email quando score=critical persiste
    await maybeAlertCriticalScore(admin, {
      userId,
      cameraId,
      score,
      latencyAvg: s.avg,
      jitter: s.jitter,
      lossPct: s.lossPct,
      suggestions,
    }).catch((e) => log('warn', 'critical_alert_error', { err: (e as Error).message }));
  }

  log('info', 'probe_done', {
    user: userId,
    target,
    samples: N,
    score,
    ok: anyOk,
    avg: s.avg,
    jitter: s.jitter,
    loss: s.lossPct,
  });

  return json({
    ok: anyOk,
    target,
    samples: N,
    samples_detail: samples.map((x) => ({ ok: x.ok, ms: x.elapsedMs, status: x.status })),
    latency: { min: s.min, avg: s.avg, max: s.max, p95: s.p95, jitter: s.jitter },
    loss_pct: s.lossPct,
    codec: describe.codec,
    resolution: describe.resolution,
    fps: describe.fps,
    fps_source: describe.fpsSource,
    resolution_source: describe.resolutionSource,
    auth_method: describe.authMethod,
    score,
    suggestions,
    warnings,
  });
});
