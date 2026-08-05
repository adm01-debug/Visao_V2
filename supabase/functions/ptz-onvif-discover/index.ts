// ptz-onvif-discover — Descoberta de capabilities e presets ONVIF.
// Faz GetCapabilities + GetProfiles + GetPresets via SOAP com WS-UsernameToken (digest PasswordDigest).
// Usado pelo AddCameraDialog e pelo painel PTZ para validar credenciais e importar presets.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DiscoverPayload {
  camera_id?: string;
  protocol?: string;
  endpoint: string;
  port?: number;
  channel?: number;
  username: string;
  password: string;
  import_presets?: boolean;
}

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ============ WS-UsernameToken Digest ============
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

function escapeXml(s: string): string {
  return s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
  );
}

async function soap(
  url: string,
  headerXml: string,
  bodyXml: string,
  timeoutMs = 6000
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="http://www.onvif.org/ver10/schema"
  xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
  xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
  xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`,
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

// ============ Extractors ============
function extractProfiles(xml: string): Array<{ token: string; name: string }> {
  const out: Array<{ token: string; name: string }> = [];
  const re = /<trt:Profiles[^>]*token="([^"]+)"[^>]*>[\s\S]*?<tt:Name>([^<]+)<\/tt:Name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push({ token: m[1], name: m[2] });
  if (out.length === 0) {
    const re2 = /token="([^"]+)"[^>]*>[\s\S]*?<tt:Name>([^<]+)<\/tt:Name>/g;
    while ((m = re2.exec(xml))) out.push({ token: m[1], name: m[2] });
  }
  return out;
}

function extractPresets(xml: string): Array<{ token: string; name: string }> {
  const out: Array<{ token: string; name: string }> = [];
  const re = /<tptz:Preset[^>]*token="([^"]+)"[^>]*>[\s\S]*?<tt:Name>([^<]+)<\/tt:Name>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push({ token: m[1], name: m[2] });
  return out;
}

function extractModel(xml: string): string | null {
  const m = /<tt:Model>([^<]+)<\/tt:Model>/.exec(xml);
  return m?.[1] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return j({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, service);

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return j({ error: 'unauthenticated' }, 401);

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
    if (!(roleSet.has('admin') || roleSet.has('manager') || roleSet.has('operator'))) {
      return j({ error: 'papel_insuficiente' }, 403);
    }

    const payload = (await req.json()) as DiscoverPayload;
    const { endpoint, username, password } = payload;
    const port = payload.port ?? 80;
    const channel = payload.channel ?? 1;
    if (!endpoint || !username || !password) return j({ error: 'missing_fields' }, 400);
    if (!/^[a-zA-Z0-9.\-_:]+$/.test(endpoint)) return j({ error: 'invalid_endpoint' }, 400);

    const deviceUrl = `http://${endpoint}:${port}/onvif/device_service`;
    const mediaUrl = `http://${endpoint}:${port}/onvif/media_service`;
    const ptzUrl = `http://${endpoint}:${port}/onvif/ptz_service`;

    const header = await wsseHeader(username, password);

    // 1. GetDeviceInformation (para modelo + valida auth)
    const infoRes = await soap(deviceUrl, header, '<tds:GetDeviceInformation/>').catch((e) => ({
      ok: false,
      status: 0,
      text: String(e),
    }));
    if (!infoRes.ok) {
      const authFail = /NotAuthorized|Sender.*NotAuthorized|401/i.test(infoRes.text);
      return j(
        {
          error: authFail ? 'auth_failed' : infoRes.status === 0 ? 'unreachable' : 'onvif_error',
          status: infoRes.status,
          hint: authFail
            ? 'Verifique usuário e senha ONVIF (não é a mesma da web às vezes)'
            : 'Verifique IP, porta e se ONVIF está habilitado na câmera',
        },
        200
      );
    }
    const model = extractModel(infoRes.text);

    // 2. GetProfiles
    const profRes = await soap(mediaUrl, header, '<trt:GetProfiles/>').catch(() => null);
    const profiles = profRes?.ok ? extractProfiles(profRes.text) : [];
    const profileToken = profiles[channel - 1]?.token ?? profiles[0]?.token ?? `Profile_${channel}`;

    // 3. GetPresets
    const presRes = await soap(
      ptzUrl,
      header,
      `<tptz:GetPresets><tptz:ProfileToken>${escapeXml(profileToken)}</tptz:ProfileToken></tptz:GetPresets>`
    ).catch(() => null);
    const presets = presRes?.ok ? extractPresets(presRes.text) : [];

    const capabilities = {
      model,
      profile_token: profileToken,
      profiles: profiles.map((p) => p.name),
      presets_count: presets.length,
      absolute_move: /AbsoluteMove/.test(presRes?.text ?? ''),
      continuous_move: true,
      discovered_at: new Date().toISOString(),
    };

    // Persistir capabilities + importar presets se camera_id fornecido
    let imported = 0;
    if (payload.camera_id) {
      await admin
        .from('camera_ptz_config')
        .update({ capabilities })
        .eq('camera_id', payload.camera_id);

      if (payload.import_presets && presets.length > 0) {
        const { data: cam } = await admin
          .from('cameras')
          .select('user_id')
          .eq('id', payload.camera_id)
          .maybeSingle();
        if (cam?.user_id) {
          for (const p of presets.slice(0, 32)) {
            const n = Number(p.token);
            if (!Number.isFinite(n) || n < 1 || n > 255) continue;
            const { error } = await admin.from('camera_presets').upsert(
              {
                camera_id: payload.camera_id,
                user_id: cam.user_id,
                preset_number: n,
                name: p.name || `Preset ${n}`,
              },
              { onConflict: 'camera_id,preset_number', ignoreDuplicates: false }
            );
            if (!error) imported++;
          }
        }
      }

      await admin
        .from('camera_vault_audit')
        .insert({
          actor_id: user.id,
          action: 'ptz_onvif_discover',
          camera_id: payload.camera_id,
          success: true,
          metadata: { model, profiles: profiles.length, presets: presets.length, imported },
        })
        .then(
          () => {},
          () => {}
        );
    }

    return j({
      ok: true,
      capabilities,
      presets: presets.map((p) => ({ token: p.token, name: p.name })),
      imported,
    });
  } catch (e) {
    return j({ error: 'internal', detail: String(e) }, 500);
  }
});
