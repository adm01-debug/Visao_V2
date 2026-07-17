// VISÃO — Public REST API v1
// Ondas 43-47+49 consolidadas: read-only + controle + URLs assinadas + filtros + health/status + webhooks HMAC
// Auth: JWT do usuário (RLS aplicada). CORS restrito. Rate-limit por IP/endpoint.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { securityHeaders } from "../_shared/securityHeaders.ts";
import {
  acknowledgeAlertSchema,
  armDisarmSchema,
  panicSchema,
  parseBody,
} from "../_shared/publicApiSchemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ============ Whitelists (SQL-injection prevention) ============
const EVENTS_FILTERABLE = new Set(["severity", "status", "camera_id", "event_id"]);
const EVENTS_ORDERABLE = new Set(["triggered_at", "acknowledged_at", "severity"]);
const CAMERAS_FILTERABLE = new Set(["status", "type", "location"]);
const ALERTS_FILTERABLE = new Set(["severity", "type", "camera_id", "acknowledged"]);
const MAX_SIGNED_URL_TTL = 604800; // 7 dias
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders(),
      ...cors,
      "Content-Type": "application/json",
      "X-API-Version": "1",
    },
  });
}

interface Filters {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  order?: { column: string; ascending: boolean };
  where: Record<string, string>;
}

function parseFilters(url: URL, filterableSet: Set<string>, orderableSet: Set<string>): Filters | { error: string } {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));

  const where: Record<string, string> = {};
  const filterRaw = url.searchParams.get("filter");
  if (filterRaw) {
    // formato: "campo:valor,campo:valor"
    for (const part of filterRaw.split(",")) {
      const [col, ...rest] = part.split(":");
      const val = rest.join(":");
      if (!col || !val) return { error: `filter mal formatado: ${part}` };
      if (!filterableSet.has(col)) return { error: `campo não filtrável: ${col}` };
      if (val.length > 128) return { error: `valor de filtro excede 128 chars` };
      if (col.endsWith("_id") && !UUID_RX.test(val)) return { error: `${col} deve ser UUID` };
      where[col] = val;
    }
  }
  // Compat: aceitar camera_id/severity soltos
  for (const legacy of ["camera_id", "severity", "status", "type"]) {
    const v = url.searchParams.get(legacy);
    if (v && filterableSet.has(legacy)) where[legacy] = v;
  }

  let order: Filters["order"];
  const orderRaw = url.searchParams.get("order");
  if (orderRaw) {
    const ascending = !orderRaw.startsWith("-");
    const column = ascending ? orderRaw : orderRaw.slice(1);
    if (!orderableSet.has(column)) return { error: `coluna não ordenável: ${column}` };
    order = { column, ascending };
  }

  return {
    page, limit,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    where, order,
  };
}

function applyWhere<T>(q: T, where: Record<string, string>): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = q;
  for (const [k, v] of Object.entries(where)) cur = cur.eq(k, v);
  return cur;
}

async function authenticate(req: Request): Promise<{ supabase: SupabaseClient; userId: string } | { error: Response }> {
  const cors = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized: missing Bearer token" }, 401, cors) };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return { error: json({ error: "Unauthorized: invalid token" }, 401, cors) };
  }
  return { supabase, userId: claims.claims.sub as string };
}

// Fire-and-forget usage logging (não bloqueia resposta)
function logUsageAsync(params: {
  userId: string | null; method: string; path: string; status: number;
  latencyMs: number; ipHash: string | null;
}): void {
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return;
    const admin = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
    const group = params.path.replace(/[0-9a-f-]{36}/gi, ":id").slice(0, 64);
    // Não aguardamos (fire-and-forget)
    admin.from("api_usage_logs").insert({
      user_id: params.userId,
      method: params.method,
      path: params.path.slice(0, 512),
      endpoint_group: group,
      status: params.status,
      latency_ms: params.latencyMs,
      ip_hash: params.ipHash,
      api_version: "v1",
    }).then(() => {}, () => {}); // silent
  } catch { /* nunca deixar telemetria falhar a request */ }
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "|visao-salt-v1");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const startedAt = Date.now();
  const preflight = handleCors(req);
  if (preflight) return preflight;
  const cors = getCorsHeaders(req);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*?(\/v1\/)/, "$1");
  const method = req.method;
  const ipRaw = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = await hashIp(ipRaw);

  const finish = (res: Response, userId: string | null): Response => {
    logUsageAsync({ userId, method, path, status: res.status, latencyMs: Date.now() - startedAt, ipHash });
    return res;
  };

  // ============ Rota pública: /v1/health ============
  if (path === "/v1/health" && method === "GET") {
    return finish(json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    }, 200, cors), null);
  }

  // Rate-limit por endpoint (panic é mais restritivo)
  const rlConfig = path.includes("/panic") || path.includes("/trigger-alert")
    ? RATE_LIMITS.sensitive
    : RATE_LIMITS.standard;
  const rl = checkRateLimit(req, rlConfig, `public-api:${path}`, cors);
  if (!rl.allowed) return finish(rl.response, null);

  const auth = await authenticate(req);
  if ("error" in auth) return finish(auth.error, null);
  const { supabase, userId } = auth;

  const wrap = (res: Response): Response => finish(res, userId);

  try {
    // ============ /v1/status (autenticado) ============
    if (path === "/v1/status" && method === "GET") {
      const { count: camerasCount } = await supabase
        .from("cameras").select("id", { count: "exact", head: true });
      return wrap(json({
        status: "healthy",
        user_id: userId,
        cameras_visible: camerasCount ?? 0,
        rate_limit: { remaining: rl.remaining, resetAt: rl.resetAt },
        api_version: "1.0.0",
      }, 200, cors));
    }

    // ============ GET /v1/cameras ============
    if (path === "/v1/cameras" && method === "GET") {
      const parsed = parseFilters(url, CAMERAS_FILTERABLE, new Set(["created_at", "name"]));
      if ("error" in parsed) return wrap(json({ error: parsed.error }, 400, cors));
      const offset = (parsed.page - 1) * parsed.limit;
      let q = supabase.from("cameras")
        .select("id,name,location,status,type,created_at,updated_at", { count: "exact" })
        .range(offset, offset + parsed.limit - 1);
      q = applyWhere(q, parsed.where);
      q = parsed.order
        ? q.order(parsed.order.column, { ascending: parsed.order.ascending })
        : q.order("created_at", { ascending: false });
      const { data, error, count } = await q;
      if (error) throw error;
      return wrap(json({
        data,
        meta: { total: count ?? 0, page: parsed.page, limit: parsed.limit, hasMore: (count ?? 0) > offset + parsed.limit },
      }, 200, cors));
    }

    // ============ GET /v1/cameras/:id ============
    const camMatch = path.match(/^\/v1\/cameras\/([0-9a-f-]{36})$/i);
    if (camMatch && method === "GET") {
      const { data, error } = await supabase.from("cameras").select("*").eq("id", camMatch[1]).maybeSingle();
      if (error) throw error;
      if (!data) return wrap(json({ error: "Camera not found" }, 404, cors));
      return wrap(json({ data }, 200, cors));
    }

    // ============ POST /v1/cameras/:id/arm | /disarm  (Onda 44 + 57) ============
    const armMatch = path.match(/^\/v1\/cameras\/([0-9a-f-]{36})\/(arm|disarm)$/i);
    if (armMatch && method === "POST") {
      const [, camId, action] = armMatch;
      const raw = await req.json().catch(() => ({}));
      const parsed = parseBody(armDisarmSchema, raw);
      if ("error" in parsed) return wrap(json(parsed.error, 400, cors));
      const reason = parsed.data.reason ?? null;
      if (action === "disarm" && !reason) {
        return wrap(json({ error: "Campo 'reason' obrigatório para disarm" }, 400, cors));
      }
      const { data: cam, error: cErr } = await supabase.from("cameras").select("id,user_id").eq("id", camId).maybeSingle();
      if (cErr) throw cErr;
      if (!cam) return wrap(json({ error: "Camera not found" }, 404, cors));
      const { data, error } = await supabase.from("arm_disarm_states").upsert({
        camera_id: camId,
        user_id: userId,
        is_armed: action === "arm",
        reason,
        armed_at: action === "arm" ? new Date().toISOString() : null,
        disarmed_at: action === "disarm" ? new Date().toISOString() : null,
      }, { onConflict: "camera_id" }).select().maybeSingle();
      if (error) throw error;
      return wrap(json({ data, action }, 200, cors));
    }

    // ============ POST /v1/alerts/:id/acknowledge (Onda 44 + 57) ============
    const ackMatch = path.match(/^\/v1\/alerts\/([0-9a-f-]{36})\/acknowledge$/i);
    if (ackMatch && method === "POST") {
      const alertId = ackMatch[1];
      const raw = await req.json().catch(() => ({}));
      const parsed = parseBody(acknowledgeAlertSchema, raw);
      if ("error" in parsed) return wrap(json(parsed.error, 400, cors));
      const { data, error } = await supabase
        .from("event_alerts")
        .update({ status: "acknowledged", acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
        .eq("id", alertId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return wrap(json({ error: "Alert not found or not accessible" }, 404, cors));
      return wrap(json({ data, idempotent: !!data.acknowledged_at }, 200, cors));
    }

    // ============ POST /v1/panic (Onda 44 + 57) ============
    if (path === "/v1/panic" && method === "POST") {
      const raw = await req.json().catch(() => ({}));
      const parsed = parseBody(panicSchema, raw);
      if ("error" in parsed) return wrap(json(parsed.error, 400, cors));
      const description = parsed.data.message ?? "Panic acionado via API";
      const cameraId = parsed.data.camera_id ?? null;
      const { data, error } = await supabase.from("panic_events").insert({
        user_id: userId,
        camera_id: cameraId,
        description,
        source: "api_v1",
        triggered_at: new Date().toISOString(),
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
      }).select().maybeSingle();
      if (error) throw error;
      return wrap(json({ data }, 201, cors));
    }

    // ============ GET /v1/clips/:id/url  (Onda 44 — signed URL) ============
    const clipMatch = path.match(/^\/v1\/clips\/([0-9a-f-]{36})\/url$/i);
    if (clipMatch && method === "GET") {
      const ttl = Math.min(MAX_SIGNED_URL_TTL, Math.max(60, parseInt(url.searchParams.get("ttl") ?? "3600", 10) || 3600));
      const { data: clip, error: cErr } = await supabase
        .from("video_clips").select("id,storage_path").eq("id", clipMatch[1]).maybeSingle();
      if (cErr) throw cErr;
      if (!clip?.storage_path) return wrap(json({ error: "Clip not found" }, 404, cors));
      const { data: signed, error: sErr } = await supabase.storage
        .from("recordings").createSignedUrl(clip.storage_path, ttl);
      if (sErr) throw sErr;
      return wrap(json({ data: { url: signed.signedUrl, expires_in: ttl } }, 200, cors));
    }

    // ============ GET /v1/events ============
    if (path === "/v1/events" && method === "GET") {
      const parsed = parseFilters(url, EVENTS_FILTERABLE, EVENTS_ORDERABLE);
      if ("error" in parsed) return wrap(json({ error: parsed.error }, 400, cors));
      const offset = (parsed.page - 1) * parsed.limit;
      let q = supabase.from("event_alerts")
        .select("id,event_id,camera_id,severity,status,triggered_at,acknowledged_at,description", { count: "exact" })
        .range(offset, offset + parsed.limit - 1);
      if (parsed.from) q = q.gte("triggered_at", parsed.from);
      if (parsed.to) q = q.lte("triggered_at", parsed.to);
      q = applyWhere(q, parsed.where);
      q = parsed.order
        ? q.order(parsed.order.column, { ascending: parsed.order.ascending })
        : q.order("triggered_at", { ascending: false });
      const { data, error, count } = await q;
      if (error) throw error;
      return wrap(json({
        data,
        meta: { total: count ?? 0, page: parsed.page, limit: parsed.limit, hasMore: (count ?? 0) > offset + parsed.limit },
      }, 200, cors));
    }

    // ============ GET /v1/events/count ============
    if (path === "/v1/events/count" && method === "GET") {
      const parsed = parseFilters(url, EVENTS_FILTERABLE, EVENTS_ORDERABLE);
      if ("error" in parsed) return wrap(json({ error: parsed.error }, 400, cors));
      let q = supabase.from("event_alerts").select("id", { count: "exact", head: true });
      if (parsed.from) q = q.gte("triggered_at", parsed.from);
      if (parsed.to) q = q.lte("triggered_at", parsed.to);
      q = applyWhere(q, parsed.where);
      const { count, error } = await q;
      if (error) throw error;
      return wrap(json({ data: { count: count ?? 0 } }, 200, cors));
    }

    // ============ GET /v1/events/summary (Onda 45) ============
    if (path === "/v1/events/summary" && method === "GET") {
      const parsed = parseFilters(url, EVENTS_FILTERABLE, EVENTS_ORDERABLE);
      if ("error" in parsed) return wrap(json({ error: parsed.error }, 400, cors));
      let q = supabase.from("event_alerts").select("severity,status");
      if (parsed.from) q = q.gte("triggered_at", parsed.from);
      if (parsed.to) q = q.lte("triggered_at", parsed.to);
      q = applyWhere(q, parsed.where);
      const { data, error } = await q;
      if (error) throw error;
      const bySeverity: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      for (const row of data ?? []) {
        const sev = String(row.severity ?? "unknown");
        const st = String(row.status ?? "unknown");
        bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
        byStatus[st] = (byStatus[st] ?? 0) + 1;
      }
      return wrap(json({
        data: {
          total: data?.length ?? 0,
          by_severity: bySeverity,
          by_status: byStatus,
          window: { from: parsed.from ?? null, to: parsed.to ?? null },
        },
      }, 200, cors));
    }

    // ============ GET /v1/alerts ============
    if (path === "/v1/alerts" && method === "GET") {
      const parsed = parseFilters(url, ALERTS_FILTERABLE, new Set(["created_at"]));
      if ("error" in parsed) return wrap(json({ error: parsed.error }, 400, cors));
      const offset = (parsed.page - 1) * parsed.limit;
      let q = supabase.from("alerts").select("*", { count: "exact" })
        .range(offset, offset + parsed.limit - 1);
      if (parsed.from) q = q.gte("created_at", parsed.from);
      if (parsed.to) q = q.lte("created_at", parsed.to);
      q = applyWhere(q, parsed.where);
      q = parsed.order
        ? q.order(parsed.order.column, { ascending: parsed.order.ascending })
        : q.order("created_at", { ascending: false });
      const { data, error, count } = await q;
      if (error) throw error;
      return wrap(json({
        data,
        meta: { total: count ?? 0, page: parsed.page, limit: parsed.limit, hasMore: (count ?? 0) > offset + parsed.limit },
      }, 200, cors));
    }

    return wrap(json({ error: "Not found", path, method }, 404, cors));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return wrap(json({ error: "Internal error", message }, 500, cors));
  }
});
