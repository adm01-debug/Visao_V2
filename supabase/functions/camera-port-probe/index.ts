// camera-port-probe — Diagnóstico rápido de conectividade antes do autodiscover.
// Recebe { host, ports?, timeout_ms?, allow_private?, run_from? } e sonda em paralelo
// as portas informadas (ou lista default: 80, 8000, 8080, 2020, 554, 8554, 443).
// Não faz SOAP nem envia credenciais — apenas TCP handshake via HTTP/HTTPS/OPTIONS
// para determinar se a porta está aberta a partir do ambiente que executa a função.
//
// Notas de arquitetura:
//   - Edge Functions rodam na nuvem: IPs privados/LAN (RFC1918) NUNCA respondem.
//     Por isso o campo `run_from` pode indicar "cloud" (default) ou "local_agent"
//     — quando um agente local encaminhar a chamada, ele deve setar
//     `run_from=local_agent` para fins de auditoria e ignorar o bloqueio de LAN.
//   - Retorna latência em ms e o motivo do erro (timeout | refused | dns | blocked_private).
//   - Não é autoritativo sobre ONVIF; só diz "algo respondeu TCP nessa porta".

import { resolveRelayTransport, type Transport } from "../_shared/relayTransport.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-source",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_PORTS = [80, 8000, 8080, 2020, 8899, 443, 554, 8554];
const MAX_PORTS = 24;
const DEFAULT_TIMEOUT_MS = 2500;
const MAX_TIMEOUT_MS = 8000;

interface Payload {
  host: string;
  ports?: number[];
  timeout_ms?: number;
  allow_private?: boolean;
  run_from?: "cloud" | "local_agent";
  relay_agent_id?: string | null;
}

interface ProbeResult {
  port: number;
  reachable: boolean;
  latency_ms: number | null;
  scheme: "http" | "https" | "raw";
  http_status: number | null;
  reason: null | "timeout" | "refused" | "dns" | "tls" | "blocked_private" | "network";
  server_hint: string | null;
}

const j = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

function classifyError(msg: string): ProbeResult["reason"] {
  const m = msg.toLowerCase();
  if (m.includes("aborted") || m.includes("timeout") || m.includes("timed out")) return "timeout";
  if (m.includes("refused") || m.includes("econnrefused")) return "refused";
  if (m.includes("dns") || m.includes("resolve") || m.includes("getaddrinfo") || m.includes("not resolve")) return "dns";
  if (m.includes("tls") || m.includes("ssl") || m.includes("certificate")) return "tls";
  return "network";
}

async function probePort(transport: Transport, host: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  const scheme: "http" | "https" = port === 443 ? "https" : "http";
  const url = `${scheme}://${host}:${port}/`;
  const start = performance.now();
  const res = await transport.request({ url, method: "GET", timeoutMs });
  const latency = Math.round(performance.now() - start);
  if (res.status > 0) {
    const server = res.headers?.["server"] ?? null;
    return {
      port,
      reachable: true,
      latency_ms: latency,
      scheme,
      http_status: res.status,
      reason: null,
      server_hint: server,
    };
  }
  const reason = classifyError(res.text);
  // Portas RTSP costumam falhar no handshake HTTP mesmo abertas — se o socket
  // ficou aberto por tempo relevante, marca como possivelmente aberta.
  const reachable = reason === "network" && latency >= timeoutMs / 4;
  return {
    port,
    reachable,
    latency_ms: latency,
    scheme,
    http_status: null,
    reason,
    server_hint: null,
  };
}

function summarize(results: ProbeResult[]): {
  open: number[];
  closed: number[];
  suggested_onvif: number[];
  suggested_rtsp: number[];
} {
  const open = results.filter((r) => r.reachable).map((r) => r.port);
  const closed = results.filter((r) => !r.reachable).map((r) => r.port);
  const onvifCandidates = [80, 8000, 8080, 2020, 8899];
  const rtspCandidates = [554, 8554];
  return {
    open,
    closed,
    suggested_onvif: open.filter((p) => onvifCandidates.includes(p)),
    suggested_rtsp: open.filter((p) => rtspCandidates.includes(p)),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return j({ error: "invalid_json" }, 400);
  }

  const host = (payload.host ?? "").trim();
  const runFrom = payload.run_from === "local_agent" ? "local_agent" : "cloud";
  const allowPrivate = payload.allow_private === true || runFrom === "local_agent";

  if (!host) return j({ error: "missing_host" }, 400);
  if (host.length > 255) return j({ error: "host_too_long" }, 400);

  if (!allowPrivate && isPrivateHost(host)) {
    return j({
      error: "private_host_blocked",
      hint:
        "Host privado/LAN detectado. Esta rota rodou na nuvem e não tem rota até essa rede. " +
        "Configure port-forwarding no roteador, use VPN/túnel, ou rode a sonda via agente local " +
        "encaminhando com run_from=\"local_agent\".",
      run_from: runFrom,
    }, 400);
  }

  const requestedPorts = (payload.ports?.length ? payload.ports : DEFAULT_PORTS)
    .map((p) => Number(p))
    .filter((p) => Number.isFinite(p) && p >= 1 && p <= 65535);

  if (requestedPorts.length === 0) return j({ error: "no_valid_ports" }, 400);
  const ports = Array.from(new Set(requestedPorts)).slice(0, MAX_PORTS);

  const timeoutMs = Math.min(
    Math.max(Number(payload.timeout_ms ?? DEFAULT_TIMEOUT_MS), 500),
    MAX_TIMEOUT_MS,
  );

  const started = Date.now();
  const results = await Promise.all(ports.map((p) => probePort(host, p, timeoutMs)));
  const elapsed = Date.now() - started;

  return j({
    ok: true,
    host,
    run_from: runFrom,
    tested_ports: ports,
    timeout_ms: timeoutMs,
    elapsed_ms: elapsed,
    results,
    summary: summarize(results),
    next_step: (() => {
      const s = summarize(results);
      if (s.suggested_onvif.length > 0) {
        return `Rode /onvif-autodiscover com ports=[${s.suggested_onvif.join(",")}] para probe SOAP direto.`;
      }
      if (s.open.length > 0) {
        return `Portas abertas encontradas (${s.open.join(",")}), mas nenhuma é candidata ONVIF típica. Verifique manualmente.`;
      }
      return "Nenhuma porta respondeu. Verifique firewall, se a câmera está online e se o host está correto.";
    })(),
  });
});
