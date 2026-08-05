// Edge Function: ptz-backends-test
// Testa cada backend PTZ nativo (ONVIF/Hikvision/Dahua/Axis) de forma
// não-destrutiva (stop) e retorna sucesso/erro + latência por protocolo.
// Usado pelo PtzSetupWizard na etapa de detecção quando o perfil OEM
// (ex.: XiongMai) expõe múltiplos backends em `ptz_backends`.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  resolveRelayTransport,
  type Transport,
  type HttpResult,
} from '../_shared/relayTransport.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PTZ_TIMEOUT_MS = 5000;

type Backend = 'onvif' | 'hikvision' | 'dahua' | 'axis';

const SUPPORTED: Backend[] = ['onvif', 'hikvision', 'dahua', 'axis'];

function b64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}
function authHeader(cfg: any): Record<string, string> {
  if (!cfg.username) return {};
  return { Authorization: `Basic ${b64(`${cfg.username}:${cfg.password_encrypted ?? ''}`)}` };
}

async function probeBackend(tx: Transport, cfg: any, backend: Backend): Promise<HttpResult> {
  if (backend === 'hikvision') {
    return tx.request({
      url: `http://${cfg.endpoint}:${cfg.port}/ISAPI/PTZCtrl/channels/${cfg.channel}/continuous`,
      method: 'PUT',
      headers: { ...authHeader(cfg), 'Content-Type': 'application/xml' },
      body: `<?xml version="1.0"?><PTZData><pan>0</pan><tilt>0</tilt><zoom>0</zoom></PTZData>`,
      timeoutMs: PTZ_TIMEOUT_MS,
    });
  }
  if (backend === 'dahua') {
    return tx.request({
      url: `http://${cfg.endpoint}:${cfg.port}/cgi-bin/ptz.cgi?action=stop&code=Left&arg1=0&arg2=0&arg3=0&channel=${cfg.channel - 1}`,
      headers: authHeader(cfg),
      timeoutMs: PTZ_TIMEOUT_MS,
    });
  }
  if (backend === 'axis') {
    return tx.request({
      url: `http://${cfg.endpoint}:${cfg.port}/axis-cgi/com/ptz.cgi?camera=${cfg.channel}&continuouspantiltmove=0,0&continuouszoommove=0`,
      headers: authHeader(cfg),
      timeoutMs: PTZ_TIMEOUT_MS,
    });
  }
  // onvif (default)
  const profile = `Profile_${cfg.channel}`;
  const body = `<?xml version="1.0"?>
  <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl">
    <s:Body><tptz:Stop><tptz:ProfileToken>${profile}</tptz:ProfileToken><tptz:PanTilt>true</tptz:PanTilt><tptz:Zoom>true</tptz:Zoom></tptz:Stop></s:Body></s:Envelope>`;
  return tx.request({
    url: `http://${cfg.endpoint}:${cfg.port}/onvif/ptz_service`,
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml', ...authHeader(cfg) },
    body,
    timeoutMs: PTZ_TIMEOUT_MS,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authorization = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      camera_id,
      backends,
      relay_agent_id = null,
      profile_id = null,
      source = 'backends_test',
    } = (await req.json()) as {
      camera_id: string;
      backends?: Backend[];
      relay_agent_id?: string | null;
      profile_id?: string | null;
      source?: 'backends_test' | 'runtime' | 'wizard';
    };
    if (!camera_id) {
      return new Response(JSON.stringify({ error: 'camera_id_obrigatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Role check (operator+)
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!(roleSet.has('admin') || roleSet.has('manager') || roleSet.has('operator'))) {
      return new Response(JSON.stringify({ error: 'papel_insuficiente' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cfg, error: cfgErr } = await admin
      .from('camera_ptz_config')
      .select('*')
      .eq('camera_id', camera_id)
      .maybeSingle();
    if (cfgErr || !cfg) {
      return new Response(JSON.stringify({ error: 'ptz_nao_configurado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resolution = await resolveRelayTransport(req, relay_agent_id);
    if (resolution.error) {
      return new Response(
        JSON.stringify({ error: resolution.error.code, hint: resolution.error.message }),
        {
          status: resolution.error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requested = (backends && backends.length ? backends : [cfg.protocol as Backend]).filter(
      (b): b is Backend => SUPPORTED.includes(b as Backend)
    );
    const unique = Array.from(new Set(requested));

    const results = await Promise.all(
      unique.map(async (backend) => {
        const started = performance.now();
        try {
          const r = await probeBackend(resolution.transport, cfg, backend);
          const latency_ms = Math.round(performance.now() - started);
          // 401/403 ainda indica que o backend está presente (só faltam credenciais)
          const reachable = r.status > 0;
          const ok = r.ok || r.status === 401 || r.status === 403;
          return {
            backend,
            ok,
            reachable,
            status: r.status,
            latency_ms,
            detail: (r.text ?? '').slice(0, 240),
          };
        } catch (e) {
          return {
            backend,
            ok: false,
            reachable: false,
            status: 0,
            latency_ms: Math.round(performance.now() - started),
            detail: String(e).slice(0, 240),
          };
        }
      })
    );

    // Persist history for debugging recurring failures
    if (results.length) {
      await admin.from('ptz_connection_attempts').insert(
        results.map((r) => ({
          user_id: user.id,
          camera_id,
          profile_id,
          backend: r.backend,
          ok: r.ok,
          reachable: r.reachable,
          http_status: r.status,
          latency_ms: r.latency_ms,
          error_detail: r.ok ? null : (r.detail ?? null),
          used_relay: resolution.usingRelay,
          relay_agent_id,
          source,
        }))
      );
    }

    // Audit (informativo, não bloqueia)
    await admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'ptz.backends_test',
      entity_type: 'camera',
      entity_id: camera_id,
      severity: 'low',
      new_values: {
        tested: unique,
        used_relay: resolution.usingRelay,
        profile_id,
        source,
        results: results.map((r) => ({
          backend: r.backend,
          ok: r.ok,
          status: r.status,
          latency_ms: r.latency_ms,
        })),
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        used_relay: resolution.usingRelay,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
