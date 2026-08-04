// agent-ingest — Recebe heartbeat, descobertas ONVIF e opera o relé HTTP do Agente Local.
// Autenticação por header X-Agent-Token (token opaco emitido pelo agent-pair).
// Rotas: POST /heartbeat, POST /discoveries, POST /relay-poll, POST /relay-complete.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getContractVersion,
  parseJsonBody,
  validatePayload,
  validateVersionedPayload,
} from "../_shared/contractValidation.ts";
import {
  AgentHeartbeatSchemaV1,
  AgentHeartbeatSchemaV2,
  AgentDiscoveriesSchemaV1,
  AgentDiscoveriesSchemaV2,
  AgentRelayPollSchema,
  AgentRelayCompleteSchemaV1,
  AgentRelayCompleteSchemaV2,
} from "../_shared/webhookSchemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-agent-token, x-api-version, x-contract-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RELAY_LONG_POLL_MS = 15_000;
const RELAY_POLL_INTERVAL_MS = 500;

function isLocalHost(h: string): boolean {
  // Strip IPv6 brackets if present (e.g., "[::1]" from URL parsing)
  const stripped = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;

  // Pure IPv4 check — four decimal octets
  const m = stripped.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [parseInt(m[1]), parseInt(m[2])];
    if (a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  // IPv6 detection — any address containing ":" is IPv6, not a hostname.
  // Must branch here before the hostname "no dots" check; global IPv6 addresses
  // such as 2001:db8::1 contain no dots and would otherwise be wrongly classified
  // as local single-label hostnames.
  if (stripped.includes(":")) {
    const lower = stripped.toLowerCase();
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped IPv6 (::ffff:x.x.x.x) — recurse on the embedded IPv4 part
    if (lower.startsWith("::ffff:")) return isLocalHost(lower.slice(7));
    return false; // all other IPv6 (e.g., 2001:db8::1) is globally routable
  }

  // Hostname: mDNS (.local, .localdomain) or single-label name with no dots (e.g., "camera1")
  if (h.endsWith(".local") || h.endsWith(".localdomain") || !h.includes(".")) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("x-agent-token");
  if (!token || token.length < 32) return j({ error: "missing_token" }, 401);

  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const version = getContractVersion(req);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: verify, error: verifyErr } = await admin.rpc("verify_agent_token", { _token: token });
  if (verifyErr || !verify || verify.length === 0) return j({ error: "invalid_token" }, 401);
  const { agent_id: agentId, agent_user_id: userId } = verify[0];

  if (route === "heartbeat") {
    const bodyResult = await parseJsonBody(req, 4_000, corsHeaders);
    if (!bodyResult.success) return bodyResult.response;
    const rawData = bodyResult.data ?? {};

    const validation = validateVersionedPayload(
      { v1: AgentHeartbeatSchemaV1, v2: AgentHeartbeatSchemaV2 },
      rawData,
      version,
      corsHeaders,
    );
    if (!validation.success) return validation.response;
    const payload = validation.data;

    await admin.from("local_agents")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(payload.agent_version !== undefined ? { version: payload.agent_version } : {}),
        last_ip: clientIp,
        ...(payload.network_cidr ? { network_cidr: payload.network_cidr } : {}),
      })
      .eq("id", agentId);
    return j({ ok: true });
  }

  if (route === "discoveries") {
    const bodyResult = await parseJsonBody(req, 128_000, corsHeaders);
    if (!bodyResult.success) return bodyResult.response;
    const rawData = bodyResult.data ?? {};

    const validation = validateVersionedPayload(
      { v1: AgentDiscoveriesSchemaV1, v2: AgentDiscoveriesSchemaV2 },
      rawData,
      version,
      corsHeaders,
    );
    if (!validation.success) return validation.response;
    const payload = validation.data;

    const rows = payload.discoveries
      .filter((d) => isLocalHost(d.host))
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

  if (route === "relay-poll") {
    const bodyResult = await parseJsonBody(req, 1_000, corsHeaders);
    if (!bodyResult.success) return bodyResult.response;
    const rawData = bodyResult.data ?? {};

    const validation = validatePayload(AgentRelayPollSchema, rawData, corsHeaders, version);
    if (!validation.success) return validation.response;
    const payload = validation.data;

    await admin.rpc("expire_agent_relay_tasks");
    await admin.from("local_agents")
      .update({ last_seen_at: new Date().toISOString(), last_ip: clientIp })
      .eq("id", agentId);

    const maxTasks = payload.max ?? 4;
    const deadline = Date.now() + RELAY_LONG_POLL_MS;
    while (true) {
      const { data, error } = await admin.rpc("claim_agent_relay_tasks", {
        _agent_id: agentId,
        _max: maxTasks,
      });
      if (error) return j({ error: "claim_failed", detail: error.message }, 500);
      if (data && data.length > 0) return j({ tasks: data });
      if (Date.now() >= deadline) return j({ tasks: [] });
      await new Promise((r) => setTimeout(r, RELAY_POLL_INTERVAL_MS));
    }
  }

  if (route === "relay-complete") {
    const bodyResult = await parseJsonBody(req, 512_000, corsHeaders);
    if (!bodyResult.success) return bodyResult.response;
    const rawData = bodyResult.data ?? {};

    const validation = validateVersionedPayload(
      { v1: AgentRelayCompleteSchemaV1, v2: AgentRelayCompleteSchemaV2 },
      rawData,
      version,
      corsHeaders,
    );
    if (!validation.success) return validation.response;
    const payload = validation.data;

    const status = payload.error ? "failed" : "done";
    const { data: updated, error } = await admin
      .from("agent_relay_tasks")
      .update({
        status,
        response: payload.response ?? null,
        error: payload.error ?? null,
        completed_at: new Date().toISOString(),
        ...("exit_code" in payload && payload.exit_code !== undefined ? { exit_code: payload.exit_code } : {}),
        ...("duration_ms" in payload && payload.duration_ms !== undefined ? { duration_ms: payload.duration_ms } : {}),
      })
      .eq("id", payload.task_id)
      .eq("agent_id", agentId)
      .in("status", ["in_progress", "pending"])
      .select("id");
    if (error) return j({ error: "update_failed", detail: error.message }, 500);
    if (!updated || updated.length === 0) return j({ error: "task_not_found_or_completed" }, 404);
    return j({ ok: true });
  }

  return j({ error: "unknown_route" }, 404);
});
