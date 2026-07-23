// onvif-autodiscover — Descoberta ONVIF automática para pré-preencher cadastro.
// Suporta dois transportes:
//   1) Direto: Edge Function fala com a câmera (host precisa ser público ou allow_private=true com rota).
//   2) Relé via Agente Local: `relay_agent_id` roteia cada chamada HTTP através do agente que roda na LAN.
//
// Segurança:
//   - Requer JWT autenticado (verify_jwt=true no config.toml).
//   - Bloqueia IPs privados/loopback quando `allow_private=false` E não há `relay_agent_id`.
//   - `relay_agent_id` só é aceito se pertencer ao user autenticado (validado via RLS).
//   - Nunca loga senha; mascara credenciais em qualquer erro.
import { createClient } from "npm:@supabase/supabase-js@2";
import { recordEdgeError } from "../_shared/errorAudit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ONVIF_PORTS_DEFAULT = [80, 8000, 8080, 2020, 8899];
const PROBE_TIMEOUT_MS = 5000;
const RELAY_TASK_TIMEOUT_MS = 25_000;
const RELAY_POLL_INTERVAL_MS = 400;
const RELAY_TASK_TTL_SEC = 45;

interface Payload {
  host: string;
  ports?: number[];
  username: string;
  password: string;
  allow_private?: boolean;
  relay_agent_id?: string | null;
}

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

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
  if (a === 100 && b >= 64 && b <= 127) return true;
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

function buildEnvelope(headerXml: string, bodyXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
  xmlns:tt="http://www.onvif.org/ver10/schema"
  xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
  xmlns:trt="http://www.onvif.org/ver10/media/wsdl">
  ${headerXml}
  <s:Body>${bodyXml}</s:Body>
</s:Envelope>`;
}

type SoapResult = { ok: boolean; status: number; text: string };

interface Transport {
  post(url: string, envelope: string, timeoutMs: number): Promise<SoapResult>;
}

// Transporte direto: fetch da própria Edge Function.
class DirectTransport implements Transport {
  async post(url: string, envelope: string, timeoutMs: number): Promise<SoapResult> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
        body: envelope,
        signal: controller.signal,
      });
      return { ok: res.ok, status: res.status, text: await res.text() };
    } catch (e) {
      return { ok: false, status: 0, text: (e as Error).message };
    } finally {
      clearTimeout(t);
    }
  }
}

// Transporte via relé: enfileira tarefa e faz polling da resposta.
class RelayTransport implements Transport {
  constructor(
    private admin: ReturnType<typeof createClient>,
    private agentId: string,
    private userId: string,
  ) {}

  async post(url: string, envelope: string, timeoutMs: number): Promise<SoapResult> {
    const bodyB64 = btoa(unescape(encodeURIComponent(envelope)));
    const expiresAt = new Date(Date.now() + RELAY_TASK_TTL_SEC * 1000).toISOString();
    const { data: inserted, error: insErr } = await this.admin
      .from("agent_relay_tasks")
      .insert({
        agent_id: this.agentId,
        user_id: this.userId,
        kind: "http_request",
        request: {
          url,
          method: "POST",
          headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
          body_b64: bodyB64,
          timeout_ms: timeoutMs,
        },
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insErr || !inserted) return { ok: false, status: 0, text: `relay_enqueue_failed:${insErr?.message ?? "unknown"}` };
    const taskId = inserted.id as string;

    const deadline = Date.now() + RELAY_TASK_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, RELAY_POLL_INTERVAL_MS));
      const { data: task } = await this.admin
        .from("agent_relay_tasks")
        .select("status, response, error")
        .eq("id", taskId)
        .maybeSingle();
      if (!task) continue;
      if (task.status === "done" && task.response) {
        const r = task.response as { status: number; body_b64: string };
        const text = decodeURIComponent(escape(atob(r.body_b64 ?? "")));
        return { ok: r.status >= 200 && r.status < 300, status: r.status, text };
      }
      if (task.status === "failed" || task.status === "expired") {
        return { ok: false, status: 0, text: `relay_${task.status}:${task.error ?? ""}` };
      }
    }
    // Timeout no lado do backend — marca tarefa para não ficar zumbi.
    await this.admin
      .from("agent_relay_tasks")
      .update({ status: "expired", error: "backend_timeout", completed_at: new Date().toISOString() })
      .eq("id", taskId)
      .in("status", ["pending", "in_progress"]);
    return { ok: false, status: 0, text: "relay_backend_timeout" };
  }
}

async function soap(tx: Transport, url: string, headerXml: string, bodyXml: string, timeoutMs = PROBE_TIMEOUT_MS) {
  return tx.post(url, buildEnvelope(headerXml, bodyXml), timeoutMs);
}

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]+)</(?:\\w+:)?${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? null;
}

async function probePort(tx: Transport, host: string, port: number): Promise<string | null> {
  const url = `http://${host}:${port}/onvif/device_service`;
  const res = await soap(tx, url, "", `<tds:GetSystemDateAndTime/>`, 3500);
  if (res.text.includes("GetSystemDateAndTimeResponse") || res.text.includes("SystemDateAndTime")) return url;
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

  const { host, username, password, ports, allow_private = false, relay_agent_id } = payload;
  if (!host || !username || !password) return j({ error: "missing_fields" }, 400);

  // Prepara transporte.
  let transport: Transport;
  let usingRelay = false;
  if (relay_agent_id) {
    // Autentica o chamador para garantir posse do agente.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return j({ error: "unauthenticated" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anon.auth.getUser();
    if (userErr || !userData?.user) return j({ error: "unauthenticated" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: agent, error: agentErr } = await admin
      .from("local_agents")
      .select("id, user_id, last_seen_at")
      .eq("id", relay_agent_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (agentErr || !agent) return j({ error: "relay_agent_not_found" }, 404);
    const lastSeen = agent.last_seen_at ? new Date(agent.last_seen_at).getTime() : 0;
    if (Date.now() - lastSeen > 120_000) {
      return j({ error: "relay_agent_offline", hint: "O agente selecionado não faz heartbeat há mais de 2 minutos." }, 409);
    }
    transport = new RelayTransport(admin, agent.id, userData.user.id);
    usingRelay = true;
  } else {
    if (!allow_private && isPrivateHost(host)) {
      await recordEdgeError({
        function_name: "onvif-autodiscover",
        error_code: "private_host_blocked",
        http_status: 400,
        target_host: host,
        run_from: "cloud",
        message: "Host privado bloqueado sem relay",
        context: { allow_private, ports: ports ?? null },
      });
      return j({
        error: "private_host_blocked",
        error_code: "private_host_blocked",
        title: "Host privado/LAN bloqueado",
        hint: "A nuvem da VISÃO não alcança IPs de rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x) diretamente. Escolha um dos caminhos abaixo para permitir a conexão.",
        steps: [
          "Opção A — Agente local (recomendado): rode o container do agente na mesma LAN da câmera e selecione-o no campo 'Rotear via Agente Local (relé)'.",
          "Opção B — Port-forward + DDNS: no roteador, redirecione a porta ONVIF (ex.: 80 ou 8000) para o IP interno da câmera e informe aqui o IP público ou hostname DDNS (ex.: minhacasa.duckdns.org).",
          "Opção C — Ambiente com rota interna: se este ambiente já tem VPN/túnel até a LAN, marque 'Permitir hosts privados/LAN' abaixo e tente novamente.",
        ],
        is_lan_host: true,
      }, 400);
    }

    transport = new DirectTransport();
  }

  const targets = ports?.length ? ports : ONVIF_PORTS_DEFAULT;

  // 1. Descoberta de porta ONVIF (paralela, primeiro que responder)
  const probes = targets.map((p) =>
    probePort(transport, host, p).then((url) => (url ? { url, port: p } : null)),
  );
  const results = await Promise.all(probes);
  const hit = results.find((r) => r !== null) as { url: string; port: number } | undefined;
  if (!hit) {
    const isLan = isPrivateHost(host);
    const stepsRelay = [
      `O agente local rodou o teste, mas nenhuma das portas ONVIF respondeu em ${host} (testadas: ${targets.join(", ")}).`,
      "Confirme que o agente está na MESMA sub-rede da câmera (mesmo switch/VLAN) e que consegue pingar o IP dela.",
      "Verifique se o ONVIF está habilitado na câmera (Configurações → Rede → Serviços Avançados → ONVIF) e se as credenciais estão corretas.",
      "Se você conhece a porta ONVIF exata (ex.: 8000 na Hikvision, 80 na Intelbras), ative 'Configuração manual do endpoint ONVIF' e informe-a.",
      "Rode 'Testar portas' para ver quais portas estão realmente abertas no host.",
    ];
    const stepsDirect = isLan
      ? [
          `Nenhuma porta ONVIF respondeu em ${host}. Como é um IP privado/LAN, a nuvem não tem rota até ele.`,
          "Opção A — Agente local: instale o agente na LAN da câmera e selecione-o em 'Rotear via Agente Local (relé)'.",
          "Opção B — Port-forward + DDNS: redirecione a porta ONVIF no roteador para o IP interno da câmera e use aqui o IP público ou hostname DDNS.",
          "Opção C — VPN/túnel dedicado até a LAN (avançado).",
        ]
      : [
          `Nenhuma porta ONVIF respondeu no host público ${host} (testadas: ${targets.join(", ")}).`,
          "Confirme que a porta correta está aberta no firewall/roteador e apontada para a câmera (port-forward).",
          "Verifique se o ONVIF está habilitado na câmera e escutando na porta esperada (Hikvision: 8000; Dahua/Intelbras: 80; Axis: 80/443).",
          "Se você conhece a porta exata, ative 'Configuração manual do endpoint ONVIF' e informe-a.",
          "Rode 'Testar portas' para diagnosticar quais portas estão realmente acessíveis.",
        ];
    return j({
      error: "no_onvif_endpoint",
      error_code: "no_onvif_endpoint",
      title: usingRelay
        ? "Agente local não encontrou ONVIF na câmera"
        : isLan
          ? "Câmera em rede local — sem rota da nuvem até ela"
          : "Nenhuma porta ONVIF respondeu no host informado",
    await recordEdgeError({
      function_name: "onvif-autodiscover",
      error_code: "no_onvif_endpoint",
      http_status: 404,
      target_host: host,
      run_from: usingRelay ? "relay" : "cloud",
      relay_agent_id: relay_agent_id ?? null,
      message: usingRelay
        ? "Agente local não encontrou ONVIF"
        : "Nenhuma porta ONVIF respondeu",
      context: { tested_ports: targets, is_lan_host: isLan },
    });
    return j({
      error: "no_onvif_endpoint",
      error_code: "no_onvif_endpoint",
      title: usingRelay
        ? "Agente local não encontrou ONVIF na câmera"
        : isLan
          ? "Câmera em rede local — sem rota da nuvem até ela"
          : "Nenhuma porta ONVIF respondeu no host informado",
      hint: usingRelay
        ? `O agente local não conseguiu falar com nenhuma porta ONVIF em ${host}.`
        : isLan
          ? "Host privado/LAN detectado — a nuvem precisa de um caminho até a câmera."
          : `Nenhuma porta ONVIF respondeu em ${host}. Verifique firewall, port-forward e se ONVIF está habilitado.`,
      steps: usingRelay ? stepsRelay : stepsDirect,
      tested_ports: targets,
      is_lan_host: isLan,
      used_relay: usingRelay,
    }, 404);
  }
  const deviceUrl = hit.url;
  const discoveredPort = hit.port;

  const header = await wsseHeader(username, password);

  const infoRes = await soap(transport, deviceUrl, header, `<tds:GetDeviceInformation/>`);
  if (!infoRes.ok && infoRes.status === 401) return j({ error: "auth_failed", hint: "Credenciais ONVIF inválidas." }, 401);
  const manufacturer = pick(infoRes.text, "Manufacturer");


  const model = pick(infoRes.text, "Model");
  const firmware = pick(infoRes.text, "FirmwareVersion");

  const profRes = await soap(transport, deviceUrl, header, `<trt:GetProfiles/>`);
  const tokens = [...profRes.text.matchAll(/token="([^"]+)"/g)].map((m) => m[1]);

  const streams: Array<{ token: string; rtsp: string }> = [];
  for (const token of tokens.slice(0, 4)) {
    const streamRes = await soap(
      transport,
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

  const capRes = await soap(transport, deviceUrl, header, `<tds:GetCapabilities><tds:Category>All</tds:Category></tds:GetCapabilities>`);
  const ptzCapable = /<(?:\w+:)?PTZ[\s>]/i.test(capRes.text);

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
    used_relay: usingRelay,
  });
});
