// VISÃO — Escalação do Watchdog: alerta quando N execuções consecutivas reportam problemas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEDUP_MS = 2 * 60 * 60 * 1000; // 2h
let lastEscalationAt = 0;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  const url = new URL(req.url);
  const minRuns = Math.max(2, Math.min(20, Number(url.searchParams.get("min") ?? "3")));
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data, error } = await supabase.rpc("cron_watchdog_consecutive_problems", {
      _min_runs: minRuns,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const consecutive = Number(row?.consecutive_problem_runs ?? 0);
    const jobnames = (row?.jobnames ?? []) as string[];
    const totalProblems = Number(row?.total_problems ?? 0);

    if (consecutive < minRuns) {
      return json({ ok: true, escalated: false, consecutive, min_runs: minRuns });
    }

    const now = Date.now();
    if (!force && now - lastEscalationAt < DEDUP_MS) {
      return json({ ok: true, escalated: false, dedup: true, consecutive });
    }

    let delivered = false;
    let deliveryError: string | null = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text =
        `🚨🚨 <b>VISÃO — Escalação do Watchdog</b>\n\n` +
        `<b>${consecutive}</b> execuções consecutivas com problemas.\n` +
        `Total acumulado: <b>${totalProblems}</b> problema(s).\n` +
        (jobnames.length > 0
          ? `Jobs afetados:\n${jobnames.slice(0, 15).map((j) => `• <code>${j}</code>`).join("\n")}`
          : "Sem detalhamento por job.") +
        `\n\n⚠️ Investigar agendador urgentemente.`;

      const resp = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      );
      delivered = resp.ok;
      if (!resp.ok) deliveryError = `telegram_${resp.status}`;
    }

    lastEscalationAt = now;

    console.log(
      JSON.stringify({
        level: "warn",
        fn: "cron-watchdog-escalate",
        msg: "escalated",
        consecutive,
        total_problems: totalProblems,
        jobs: jobnames.length,
        delivered,
        delivery_error: deliveryError,
      }),
    );

    return json({
      ok: true,
      escalated: true,
      consecutive,
      total_problems: totalProblems,
      jobnames,
      delivered,
      delivery_error: deliveryError,
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        fn: "cron-watchdog-escalate",
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
