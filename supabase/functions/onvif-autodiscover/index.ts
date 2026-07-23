// onvif-autodiscover — Descoberta ONVIF automática para pré-preencher cadastro.
// Recebe host (IP/hostname) + credenciais e retorna: porta ONVIF, RTSP principal/substream,
// modelo, fabricante e capability PTZ. Faz varredura de portas ONVIF comuns e SOAP calls
// (GetDeviceInformation, GetProfiles, GetStreamUri) com WS-UsernameToken PasswordDigest.
//
// Segurança:
//   - Requer JWT autenticado (verify_jwt=true no config.toml).
//   - Bloqueia IPs privados/loopback quando `allow_private=false` (default false) para evitar SSRF.
//   - Nunca loga senha; mascara credenciais em qualquer erro.
//   - Timeout curto (5s por probe) para evitar prender worker.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ONVIF_PORTS_DEFAULT = [80, 8000, 8080, 2020, 8899, 8899];
const PROBE_TIMEOUT_MS = 5000;

interface Payload {
  host: string;
  ports?: number[];
  username: string;
  password: string;
  allow_private?: boolean;
}

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function maskCreds(s: string, user: string, pass: string): string {
  return s
    .replaceAll(user, "[USER]")
    .replaceAll(pass, "[REDACTED]")
    .replace(/rtsps?:\/\/[^@\s]+@/gi, "rtsp://[REDACTED]@");
}

// Bloqueia RFC1918/loopback/link-local/CGNAT para evitar SSRF.
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1]), parseInt(m[2])];
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 0) return true;
  return false;
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
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", buf));
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

async function soap(
  url: string,
  headerXml: string,
  bodyXml: string,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="http://www.onvif.org/ver10/schema"
  xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
  xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`,
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, text: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, text: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]+)</(?:\\w+:)?${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? null;
}
function pickAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]+)</(?:\\w+:)?${tag}>`, "gi");
  return [...xml.matchAll(re)].map((m) => m[1].trim());
}

async function probePort(host: string, port: number): Promise<string | null> {
  const url = `http://${host}:${port}/onvif/device_service`;
  const res = await soap(url, "", `<tds:GetSystemDateAndTime/>`, 3000);
  if (res.text.includes("GetSystemDateAndTimeResponse") || res.text.includes("SystemDateAndTime")) {
    return url;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return j({ error: "invalid_json" }, 400);
  }

  const { host, username, password, ports, allow_private = false } = payload;
  if (!host || !username || !password) return j({ error: "missing_fields" }, 400);
  if (!allow_private && isPrivateHost(host)) {
    return j({
      error: "private_host_blocked",
      hint: "Host privado/LAN detectado. Use um agente local ou informe allow_private=true se a Edge Function tiver rota até essa rede.",
    }, 400);
  }

  const targets = ports?.length ? ports : ONVIF_PORTS_DEFAULT;
  let deviceUrl: string | null = null;
  let discoveredPort = 0;

  // 1. Descoberta de porta ONVIF (paralela, primeiro que responder)
  const probes = targets.map((p) =>
    probePort(host, p).then((url) => (url ? { url, port: p } : null)),
  );
  const results = await Promise.all(probes);
  const hit = results.find((r) => r !== null) as { url: string; port: number } | undefined;
  if (!hit) {
    const lanHint = isPrivateHost(host)
      ? ` IMPORTANTE: ${host} é um IP de LAN (rede local). A Edge Function roda na nuvem e não tem rota até sua rede interna — nenhum pacote chega até a câmera. Soluções: (1) faça port-forward no roteador expondo a porta ONVIF via IP público/DDNS, (2) use um túnel/VPN entre a nuvem e sua LAN, ou (3) rode um agente local dentro da rede da câmera que faça o discover e envie o resultado ao backend.`
      : ` Verifique firewall, se ONVIF está habilitado ou se a porta é diferente.`;
    return j({
      error: "no_onvif_endpoint",
      hint: `Nenhuma porta ONVIF respondeu em ${host} (testadas: ${targets.join(", ")}).${lanHint}`,
      tested_ports: targets,
      is_lan_host: isPrivateHost(host),
    }, 404);
  }
  deviceUrl = hit.url;
  discoveredPort = hit.port;

  const header = await wsseHeader(username, password);

  // 2. Informações do dispositivo
  const infoRes = await soap(deviceUrl, header, `<tds:GetDeviceInformation/>`);
  if (!infoRes.ok && infoRes.status === 401) {
    return j({ error: "auth_failed", hint: "Credenciais ONVIF inválidas." }, 401);
  }
  const manufacturer = pick(infoRes.text, "Manufacturer");
  const model = pick(infoRes.text, "Model");
  const firmware = pick(infoRes.text, "FirmwareVersion");

  // 3. Media service — endereço pode variar; tenta GetProfiles no próprio device_service (roteia)
  const profRes = await soap(deviceUrl, header, `<trt:GetProfiles/>`);
  const profileTokens = pickAll(profRes.text, "Profiles")
    .map((_, i) => {
      const re = new RegExp(`<(?:\\w+:)?Profiles[^>]*token="([^"]+)"`, "gi");
      const all = [...profRes.text.matchAll(re)];
      return all[i]?.[1] ?? null;
    })
    .filter(Boolean) as string[];

  // Fallback: extrai tokens direto por regex se o parse acima falhar
  let tokens = profileTokens;
  if (tokens.length === 0) {
    tokens = [...profRes.text.matchAll(/token="([^"]+)"/g)].map((m) => m[1]);
  }

  const streams: Array<{ token: string; rtsp: string; resolution?: string }> = [];
  for (const token of tokens.slice(0, 4)) {
    const streamRes = await soap(
      deviceUrl,
      header,
      `<trt:GetStreamUri>
        <trt:StreamSetup>
          <tt:Stream>RTP-Unicast</tt:Stream>
          <tt:Transport><tt:Protocol>RTSP</tt:Protocol></tt:Transport>
        </trt:StreamSetup>
        <trt:ProfileToken>${escapeXml(token)}</trt:ProfileToken>
      </trt:GetStreamUri>`,
    );
    const uri = pick(streamRes.text, "Uri");
    if (uri) streams.push({ token, rtsp: uri });
  }

  // 4. Capability PTZ (heurística: presença de nó PTZ em capabilities)
  const capRes = await soap(deviceUrl, header, `<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>`);
  const ptzCapable = /<(?:\w+:)?PTZ[\s>]/i.test(capRes.text);

  // Ordena streams: maior resolução (heurística por posição do profile) fica como principal
  const primary = streams[0];
  const substream = streams[1];

  return j({
    ok: true,
    device: { manufacturer, model, firmware },
    onvif: { host, port: discoveredPort, endpoint: deviceUrl },
    ptz_capable: ptzCapable,
    profiles: streams.length,
    rtsp_primary: primary?.rtsp ?? null,
    rtsp_substream: substream?.rtsp ?? null,
  });
});
