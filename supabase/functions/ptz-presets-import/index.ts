// ptz-presets-import — Lista e importa presets ONVIF já cadastrados na câmera.
// Fase 1 (mode="list"): retorna presets existentes na câmera para seleção.
// Fase 2 (mode="import"): grava os `selections` em public.camera_presets
// respeitando o nome renomeado pelo usuário no wizard.
//
// Usa as credenciais persistidas em camera_ptz_config (mesmo padrão dos demais
// edge functions PTZ), sem exigir que o cliente passe usuário/senha em claro.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!),
  );
}

async function wsseHeader(username: string, password: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const created = new Date().toISOString();
  const passBytes = new TextEncoder().encode(password);
  const createdBytes = new TextEncoder().encode(created);
  const buf = new Uint8Array(nonce.length + createdBytes.length + passBytes.length);
  buf.set(nonce, 0);
  buf.set(createdBytes, nonce.length);
  buf.set(passBytes, nonce.length + createdBytes.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', buf));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `<s:Header>
    <Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <UsernameToken>
        <Username>${escapeXml(username)}</Username>
        <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${b64(digest)}</Password>
        <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${b64(nonce)}</Nonce>
        <Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">${created}</Created>
      </UsernameToken>
    </Security>
  </s:Header>`;
}

async function soap(url: string, headerXml: string, bodyXml: string, timeoutMs = 6000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="http://www.onvif.org/ver10/schema"
  xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
  xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } finally {
    clearTimeout(t);
  }
}

interface OnvifPreset {
  token: string;
  name: string;
  pan?: number;
  tilt?: number;
  zoom?: number;
}

function extractPresets(xml: string): OnvifPreset[] {
  const out: OnvifPreset[] = [];
  const re = /<tptz:Preset[^>]*token="([^"]+)"[^>]*>([\s\S]*?)<\/tptz:Preset>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const inner = m[2];
    const name = /<tt:Name>([^<]+)<\/tt:Name>/.exec(inner)?.[1] ?? '';
    const pt = /<tt:PanTilt[^\/]*x="([\-0-9.]+)"[^\/]*y="([\-0-9.]+)"/.exec(inner);
    const zm = /<tt:Zoom[^\/]*x="([\-0-9.]+)"/.exec(inner);
    out.push({
      token: m[1],
      name,
      pan: pt ? Number(pt[1]) : undefined,
      tilt: pt ? Number(pt[2]) : undefined,
      zoom: zm ? Number(zm[1]) : undefined,
    });
  }
  return out;
}

interface Selection {
  token: string;
  name: string;
  preset_number?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return j({ error: 'method_not_allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(supabaseUrl, service);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthenticated' }, 401);

    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    if (!(roleSet.has('admin') || roleSet.has('manager') || roleSet.has('operator'))) {
      return j({ error: 'papel_insuficiente' }, 403);
    }

    const body = (await req.json()) as {
      camera_id: string;
      mode?: 'list' | 'import';
      selections?: Selection[];
    };
    const camera_id = body.camera_id;
    const mode = body.mode ?? 'list';
    if (!camera_id) return j({ error: 'camera_id_obrigatorio' }, 400);

    // 1) Config PTZ (endpoint/porta/credenciais)
    const { data: cfg, error: cfgErr } = await admin
      .from('camera_ptz_config')
      .select('*')
      .eq('camera_id', camera_id)
      .maybeSingle();
    if (cfgErr || !cfg) return j({ error: 'ptz_nao_configurado' }, 404);
    if (!cfg.username || !cfg.password_encrypted) {
      return j({ error: 'credenciais_ausentes', hint: 'Configure usuário/senha ONVIF na câmera' }, 400);
    }

    // 2) Dono da câmera (para gravar user_id nos presets)
    const { data: cam } = await admin
      .from('cameras')
      .select('user_id')
      .eq('id', camera_id)
      .maybeSingle();
    if (!cam?.user_id) return j({ error: 'camera_nao_encontrada' }, 404);

    // 3) ONVIF GetPresets
    const port = cfg.port ?? 80;
    const channel = cfg.channel ?? 1;
    const profileToken =
      (cfg.capabilities as { profile_token?: string } | null)?.profile_token ?? `Profile_${channel}`;
    const ptzUrl = `http://${cfg.endpoint}:${port}/onvif/ptz_service`;
    const header = await wsseHeader(cfg.username, cfg.password_encrypted);

    const presRes = await soap(
      ptzUrl,
      header,
      `<tptz:GetPresets><tptz:ProfileToken>${escapeXml(profileToken)}</tptz:ProfileToken></tptz:GetPresets>`,
    ).catch((e) => ({ ok: false, status: 0, text: String(e) }));
    if (!presRes.ok) {
      const authFail = /NotAuthorized|401/i.test(presRes.text);
      return j({
        error: authFail ? 'auth_failed' : presRes.status === 0 ? 'unreachable' : 'onvif_error',
        status: presRes.status,
      }, 200);
    }
    const presets = extractPresets(presRes.text);

    if (mode === 'list') {
      return j({ ok: true, presets, profile_token: profileToken });
    }

    // 4) Importa apenas os selecionados
    const selections = Array.isArray(body.selections) ? body.selections : [];
    if (selections.length === 0) return j({ ok: true, imported: 0, presets });

    // Mapeia token->preset da câmera para obter posição
    const byToken = new Map(presets.map((p) => [p.token, p]));

    // Números já usados no banco (para autoatribuir 1..255 sem colidir)
    const { data: existing } = await admin
      .from('camera_presets')
      .select('preset_number')
      .eq('camera_id', camera_id);
    const used = new Set<number>((existing ?? []).map((r: { preset_number: number }) => r.preset_number));

    const nextFree = () => {
      for (let n = 1; n <= 255; n++) if (!used.has(n)) return n;
      return null;
    };

    let imported = 0;
    const errors: Array<{ token: string; error: string }> = [];

    for (const sel of selections.slice(0, 64)) {
      const src = byToken.get(sel.token);
      if (!src) {
        errors.push({ token: sel.token, error: 'preset_nao_encontrado_na_camera' });
        continue;
      }

      let n = Number(sel.preset_number ?? Number(sel.token));
      if (!Number.isFinite(n) || n < 1 || n > 255 || used.has(n)) {
        const free = nextFree();
        if (free == null) {
          errors.push({ token: sel.token, error: 'limite_255_atingido' });
          continue;
        }
        n = free;
      }
      used.add(n);

      const name = (sel.name || src.name || `Preset ${n}`).slice(0, 60);
      const position: Record<string, number> = {};
      if (typeof src.pan === 'number') position.pan = src.pan;
      if (typeof src.tilt === 'number') position.tilt = src.tilt;
      if (typeof src.zoom === 'number') position.zoom = src.zoom;

      const { error } = await admin
        .from('camera_presets')
        .upsert(
          {
            camera_id,
            user_id: cam.user_id,
            preset_number: n,
            name,
            ptz_position: position,
          },
          { onConflict: 'camera_id,preset_number', ignoreDuplicates: false },
        );
      if (error) errors.push({ token: sel.token, error: error.message });
      else imported++;
    }

    await admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'ptz.presets_import',
      entity_type: 'camera',
      entity_id: camera_id,
      severity: 'low',
      new_values: { imported, requested: selections.length, errors },
    });

    return j({ ok: true, imported, errors, presets });
  } catch (e) {
    return j({ error: 'internal', detail: String(e) }, 500);
  }
});
