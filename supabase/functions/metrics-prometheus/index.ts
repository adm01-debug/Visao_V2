// Wave Storage 17 — /metrics endpoint no formato Prometheus exposition
// Autenticado via Bearer token (PROMETHEUS_METRICS_BEARER_TOKEN). Rate-limited.
// Exporta SLO de tiering, contagem de restaurações Glacier e alertas presos.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const PROM_CT = "text/plain; version=0.0.4; charset=utf-8";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function fmt(name: string, help: string, type: string, samples: Array<{ labels?: Record<string,string>; value: number }>): string {
  const lines = [`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`];
  for (const s of samples) {
    if (!Number.isFinite(s.value)) continue;
    const labels = s.labels
      ? "{" + Object.entries(s.labels).map(([k,v]) => `${k}="${String(v).replace(/"/g,'\\"')}"`).join(",") + "}"
      : "";
    lines.push(`${name}${labels} ${s.value}`);
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // Bearer auth
  const expected = Deno.env.get("PROMETHEUS_METRICS_BEARER_TOKEN") ?? "";
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !token || !timingSafeEqual(token, expected)) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  // Rate limit
  const rl = checkRateLimit(req, { maxRequests: 30, windowMs: 60_000 }, "metrics-prom", corsHeaders);
  if (!rl.allowed) return rl.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const blocks: string[] = [];

  // 1) SLO tiering (últimas 24h)
  try {
    const { data: slo, error } = await supabase.rpc("get_storage_tiering_slo", { _window_hours: 24 });
    if (error) throw error;
    const rows = Array.isArray(slo) ? slo : [];
    blocks.push(fmt(
      "visao_tiering_p95_seconds",
      "P95 latency of tiering operations (seconds).",
      "gauge",
      rows.map((r: any) => ({ labels: { operation: r.operation }, value: Number(r.p95_seconds ?? 0) })),
    ));
    blocks.push(fmt(
      "visao_tiering_success_ratio",
      "Success ratio of tiering operations (0..1).",
      "gauge",
      rows.map((r: any) => ({ labels: { operation: r.operation }, value: Number(r.success_ratio ?? 0) })),
    ));
    blocks.push(fmt(
      "visao_tiering_slo_status",
      "SLO status per operation (0=ok,1=risk,2=violated,3=no_data).",
      "gauge",
      rows.map((r: any) => ({
        labels: { operation: r.operation },
        value: ({ ok: 0, risk: 1, violated: 2, no_data: 3 } as any)[r.status] ?? 3,
      })),
    ));
  } catch (_e) {
    blocks.push("# tiering_slo_unavailable");
  }

  // 2) Glacier restore em andamento
  try {
    const { data, error } = await supabase.rpc("get_glacier_restore_status", { _limit: 500 });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const pending = rows.filter((r: any) => r.status === "pending").length;
    const stuck = rows.filter((r: any) => r.hours_pending && r.hours_pending > 12).length;
    blocks.push(fmt("visao_glacier_restore_pending_total", "Glacier restores currently pending.", "gauge", [{ value: pending }]));
    blocks.push(fmt("visao_glacier_restore_stuck_total", "Glacier restores pending > 12h.", "gauge", [{ value: stuck }]));
  } catch (_e) {
    blocks.push("# glacier_restore_unavailable");
  }

  // 3) Alertas de Glacier preso (últimas 24h)
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error } = await supabase
      .from("glacier_stuck_alerts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    if (error) throw error;
    blocks.push(fmt("visao_glacier_stuck_alerts_24h", "Glacier stuck alerts emitted in the last 24h.", "gauge", [{ value: count ?? 0 }]));
  } catch (_e) {
    blocks.push("# glacier_stuck_alerts_unavailable");
  }

  // 4) Heartbeat sintético — dead-man's switch (Onda Storage 20).
  //    Sempre emitido, independente das fontes acima. Se este valor ficar stale
  //    no Prometheus, o alerta VisaoMetricsExporterHeartbeatStale dispara.
  blocks.push(fmt(
    "visao_exporter_heartbeat_timestamp_seconds",
    "Unix timestamp of the last successful /metrics render (dead-man's switch).",
    "gauge",
    [{ value: Math.floor(Date.now() / 1000) }],
  ));
  blocks.push(fmt(
    "visao_exporter_build_info",
    "Build info of the VISÃO Prometheus exporter.",
    "gauge",
    [{ labels: { version: "20.0.0", wave: "storage-20" }, value: 1 }],
  ));

  const body = blocks.join("\n") + "\n";
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": PROM_CT, "Cache-Control": "no-store" },
  });
});
