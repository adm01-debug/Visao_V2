import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("run-retention");

/**
 * Edge function que dispara a rotina de retenção do banco.
 *
 * Segurança:
 *  - Requer header `x-retention-secret` que deve bater com o secret
 *    `RETENTION_SECRET` (agendado por cron externo — GitHub Actions,
 *    Cloud Scheduler, etc.).
 *  - Usa SERVICE_ROLE porque `run_retention_cleanup()` é REVOKE-ALL / GRANT service_role.
 *  - Nunca aceita input do usuário — apenas dispara a RPC.
 */
serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("RETENTION_SECRET");
  if (!expectedSecret) {
    log.error("RETENTION_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const providedSecret = req.headers.get("x-retention-secret");
  if (providedSecret !== expectedSecret) {
    log.warn("Unauthorized retention attempt", { ip: req.headers.get("x-forwarded-for") });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const started = Date.now();
    const { data, error } = await supabase.rpc("run_retention_cleanup");

    if (error) {
      log.error("Retention RPC failed", { error: error.message });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elapsed_ms = Date.now() - started;
    log.info("Retention completed", { data, elapsed_ms });

    return new Response(JSON.stringify({ success: true, elapsed_ms, ...data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log.error("Unhandled retention error", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
