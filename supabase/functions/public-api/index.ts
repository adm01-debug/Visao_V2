// VISÃO — Public REST API v1 (read-only)
// Origem: Onda 43 do plano consolidado (paridade ZoneMinder API §Monitors/Events)
// Endpoints:
//   GET /v1/cameras
//   GET /v1/cameras/:id
//   GET /v1/events            (event_alerts)
//   GET /v1/events/count
//   GET /v1/alerts
// Auth: JWT do usuário (RLS aplicada). CORS restrito. Rate-limit por IP.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface QueryFilters {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  cameraId?: string;
  severity?: string;
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function parseFilters(url: URL): QueryFilters {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  return {
    page,
    limit,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    cameraId: url.searchParams.get("camera_id") ?? undefined,
    severity: url.searchParams.get("severity") ?? undefined,
  };
}

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;
  const cors = getCorsHeaders(req);

  // Rate limit (60 req/min por IP)
  const rl = checkRateLimit(req, RATE_LIMITS.standard, "public-api", cors);
  if (!rl.allowed) return rl.response;

  const url = new URL(req.url);
  // Normaliza pathname: /public-api/v1/cameras → /v1/cameras
  const path = url.pathname.replace(/^.*?(\/v1\/)/, "$1");

  if (req.method !== "GET") {
    return json({ error: "Method not allowed. API v1 é read-only." }, 405, cors);
  }

  // Auth JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized: missing Bearer token" }, 401, cors);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) {
    return json({ error: "Unauthorized: invalid token" }, 401, cors);
  }

  const filters = parseFilters(url);
  const offset = (filters.page - 1) * filters.limit;

  try {
    // GET /v1/cameras
    if (path === "/v1/cameras") {
      const { data, error, count } = await supabase
        .from("cameras")
        .select("id,name,location,status,type,created_at,updated_at", { count: "exact" })
        .range(offset, offset + filters.limit - 1)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({
        data,
        meta: { total: count ?? 0, page: filters.page, limit: filters.limit, hasMore: (count ?? 0) > offset + filters.limit },
      }, 200, cors);
    }

    // GET /v1/cameras/:id
    const camMatch = path.match(/^\/v1\/cameras\/([0-9a-f-]{36})$/i);
    if (camMatch) {
      const { data, error } = await supabase
        .from("cameras")
        .select("*")
        .eq("id", camMatch[1])
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Camera not found" }, 404, cors);
      return json({ data }, 200, cors);
    }

    // GET /v1/events
    if (path === "/v1/events") {
      let q = supabase
        .from("event_alerts")
        .select("id,event_id,camera_id,severity,status,triggered_at,acknowledged_at,description", { count: "exact" })
        .range(offset, offset + filters.limit - 1)
        .order("triggered_at", { ascending: false });
      if (filters.from) q = q.gte("triggered_at", filters.from);
      if (filters.to) q = q.lte("triggered_at", filters.to);
      if (filters.cameraId) q = q.eq("camera_id", filters.cameraId);
      if (filters.severity) q = q.eq("severity", filters.severity);
      const { data, error, count } = await q;
      if (error) throw error;
      return json({
        data,
        meta: { total: count ?? 0, page: filters.page, limit: filters.limit, hasMore: (count ?? 0) > offset + filters.limit },
      }, 200, cors);
    }

    // GET /v1/events/count
    if (path === "/v1/events/count") {
      let q = supabase.from("event_alerts").select("id", { count: "exact", head: true });
      if (filters.from) q = q.gte("triggered_at", filters.from);
      if (filters.to) q = q.lte("triggered_at", filters.to);
      if (filters.cameraId) q = q.eq("camera_id", filters.cameraId);
      if (filters.severity) q = q.eq("severity", filters.severity);
      const { count, error } = await q;
      if (error) throw error;
      return json({ data: { count: count ?? 0 } }, 200, cors);
    }

    // GET /v1/alerts
    if (path === "/v1/alerts") {
      let q = supabase
        .from("alerts")
        .select("*", { count: "exact" })
        .range(offset, offset + filters.limit - 1)
        .order("created_at", { ascending: false });
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      if (filters.cameraId) q = q.eq("camera_id", filters.cameraId);
      const { data, error, count } = await q;
      if (error) throw error;
      return json({
        data,
        meta: { total: count ?? 0, page: filters.page, limit: filters.limit, hasMore: (count ?? 0) > offset + filters.limit },
      }, 200, cors);
    }

    return json({ error: "Not found", path }, 404, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: "Internal error", message }, 500, cors);
  }
});
