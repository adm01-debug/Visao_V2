// agent-ingest — Recebe heartbeat e descobertas ONVIF do Agente Local.
// Autenticação por header X-Agent-Token (token opaco emitido pelo agent-pair).
// Rotas: POST /heartbeat, POST /discoveries.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-agent-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_BODY_BYTES = 512 * 1024;
const MAX_DISCOVERIES = 128;

interface DiscoveryPayload {
  host: string;
  port: number;
  manufacturer?: string | null;
  model?: string | null;
  firmware?: string | null;
  onvif_endpoint?: string | null;
  rtsp_primary?: string | null;
  rtsp_substream?: string | null;
  ptz_capable?: boolean;
  discovered_at?: string;
  raw?: unknown;
}

function isPrivateHost(h: string): boolean {
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1]), parseInt(m[2])];
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("x-agent-token");
  if (!token || token.length < 32) return j({ error: "missing_token" }, 401);

  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) return j({ error: "body_too_large" }, 413);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: verify, error: verifyErr } = await admin.rpc("verify_agent_token", { _token: token });
  if (verifyErr || !verify || verify.length === 0) return j({ error: "invalid_token" }, 401);
  const { agent_id: agentId, agent_user_id: userId } = verify[0];

  const url = new URL(req.url);
  const route = url.pathname.split("/").pop();
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return j({ error: "invalid_json" }, 400);
  }

  if (route === "heartbeat") {
    const version = typeof payload.agent_version === "string" ? payload.agent_version.slice(0, 40) : null;
    const cidr = typeof payload.network_cidr === "string" ? payload.network_cidr.slice(0, 60) : null;
    await admin.from("local_agents")
      .update({
        last_seen_at: new Date().toISOString(),
        version,
        last_ip: clientIp,
        ...(cidr ? { network_cidr: cidr } : {}),
      })
      .eq("id", agentId);
    return j({ ok: true });
  }

  if (route === "discoveries") {
    const list = Array.isArray(payload.discoveries) ? payload.discoveries as DiscoveryPayload[] : [];
    if (list.length === 0) return j({ ok: true, upserted: 0 });
    if (list.length > MAX_DISCOVERIES) return j({ error: "too_many_discoveries" }, 400);

    const rows = list
      .filter((d) => typeof d.host === "string" && typeof d.port === "number" && d.port > 0 && d.port < 65536)
      .filter((d) => isPrivateHost(d.host) || d.host.length <= 253)
      .slice(0, MAX_DISCOVERIES)
      .map((d) => ({
        agent_id: agentId,
        user_id: userId,
        host: d.host,
        port: d.port,
        manufacturer: d.manufacturer ?? null,
        model: d.model ?? null,
        firmware: d.firmware ?? null,
        onvif_endpoint: d.onvif_endpoint ?? null,
        rtsp_primary: d.rtsp_primary ?? null,
        rtsp_substream: d.rtsp_substream ?? null,
        ptz_capable: Boolean(d.ptz_capable),
        raw: d.raw ?? null,
        discovered_at: d.discovered_at ?? new Date().toISOString(),
      }));

    const { error } = await admin
      .from("agent_discoveries")
      .upsert(rows, { onConflict: "agent_id,host,port" });
    if (error) return j({ error: "upsert_failed", detail: error.message }, 500);

    await admin.from("local_agents")
      .update({ last_seen_at: new Date().toISOString(), last_ip: clientIp })
      .eq("id", agentId);

    return j({ ok: true, upserted: rows.length });
  }

  return j({ error: "unknown_route" }, 404);
});
