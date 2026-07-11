import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const log = createLogger("health");

const VERSION = "2.0.0";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Prevent DoS on health probe (30 req/min per IP is plenty for uptime checks)
  const rl = checkRateLimit(req, { maxRequests: 30, windowMs: 60_000 }, "health", corsHeaders);
  if (!rl.allowed) return rl.response;



  const start = Date.now();

  const checks: Record<string, { status: string; latency_ms?: number; error?: string; details?: Record<string, unknown> }> = {};

  // 1. Database connectivity
  try {
    const dbStart = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count, error } = await supabase.from("cameras").select("id", { count: "exact", head: true });
    checks.database = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
      details: { tables_accessible: !error, sample_count: count ?? 0 },
    };
  } catch (e) {
    checks.database = { status: "unhealthy", error: e instanceof Error ? e.message : "Unknown error" };
  }

  // 2. Required secrets
  const requiredSecrets = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "LOVABLE_API_KEY"];
  const missingSecrets = requiredSecrets.filter((s) => !Deno.env.get(s));
  checks.secrets = {
    status: missingSecrets.length === 0 ? "healthy" : "degraded",
    details: {
      total: requiredSecrets.length,
      configured: requiredSecrets.length - missingSecrets.length,
      missing: missingSecrets.length > 0 ? missingSecrets : undefined,
    },
  };

  // 3. Edge Functions runtime
  checks.runtime = {
    status: "healthy",
    details: {
      deno_version: Deno.version?.deno ?? "unknown",
      v8_version: Deno.version?.v8 ?? "unknown",
      typescript_version: Deno.version?.typescript ?? "unknown",
    },
  };

  // 4. Memory
  checks.memory = {
    status: "healthy",
  };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
  const hasDegraded = Object.values(checks).some((c) => c.status === "degraded");
  const overallStatus = allHealthy ? "healthy" : hasDegraded ? "degraded" : "unhealthy";

  const traceId = req.headers.get("x-request-id") || undefined;
  log.info("Health check completed", { status: overallStatus, duration_ms: Date.now() - start, traceId });

  return new Response(
    JSON.stringify({
      status: overallStatus,
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime_check_ms: Date.now() - start,
      checks,
    }),
    {
      status: allHealthy ? 200 : hasDegraded ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" },
    }
  );
});
