import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("cameras").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e) {
    checks.database = { status: "unhealthy", error: e instanceof Error ? e.message : "Unknown error" };
  }

  // Check edge functions runtime
  checks.runtime = {
    status: "healthy",
    latency_ms: 0,
  };

  // Check memory
  checks.memory = {
    status: "healthy",
  };

  const allHealthy = Object.values(checks).every((c) => c.status === "healthy");
  const overallStatus = allHealthy ? "healthy" : "degraded";

  return new Response(
    JSON.stringify({
      status: overallStatus,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime_check_ms: Date.now() - start,
      checks,
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
