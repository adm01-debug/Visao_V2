// VISÃO — Watchdog de agendamentos pg_cron.
// Verifica falhas recentes por job e dispara alerta no Telegram, com dedup em memória.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEDUP_MS = 60 * 60 * 1000; // 1h por job
const lastAlertPerJob = new Map<string, number>();

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_message: string | null;
  failure_count_24h: number;
  success_count_24h: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  const url = new URL(req.url);
  const minFailures = Math.max(1, Math.min(100, Number(url.searchParams.get("min") ?? "2")));
  const staleMinutes = Math.max(
    5,
    Math.min(24 * 60, Number(url.searchParams.get("stale") ?? "180")),
  );
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data, error } = await supabase.rpc("list_cron_jobs_service");
    if (error) throw error;

    const jobs = (data ?? []) as CronJob[];
    const now = Date.now();
    const problems: Array<{ job: CronJob; reason: string }> = [];

    for (const j of jobs) {
      if (!j.active) continue;
      if (j.failure_count_24h >= minFailures) {
        problems.push({
          job: j,
          reason: `${j.failure_count_24h} falha(s) em 24h`,
        });
        continue;
      }
      if (j.last_run) {
        const ageMin = (now - new Date(j.last_run).getTime()) / 60_000;
        if (ageMin > staleMinutes) {
          problems.push({
            job: j,
            reason: `sem execução há ${Math.round(ageMin)}min`,
          });
        }
      }
    }

    const alerts: string[] = [];
    let dedupSkipped = 0;

    for (const p of problems) {
      const key = `${p.job.jobname}::${p.reason.split(" ")[0]}`;
      const last = lastAlertPerJob.get(key) ?? 0;
      if (!force && now - last < DEDUP_MS) {
        dedupSkipped++;
        continue;
      }
      lastAlertPerJob.set(key, now);
      alerts.push(
        `• <b>${p.job.jobname}</b> — ${p.reason}` +
          (p.job.last_status ? ` (último status: ${p.job.last_status})` : ""),
      );
    }

    let delivered = false;
    let deliveryError: string | null = null;

    if (alerts.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const text =
        `🚨 <b>VISÃO — Watchdog do agendador</b>\n\n` +
        alerts.join("\n") +
        `\n\nJanela: 24h · falhas mín.: ${minFailures} · stale: ${staleMinutes}min`;
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

    const details = problems.map((p) => ({
      jobname: p.job.jobname,
      reason: p.reason,
      last_status: p.job.last_status,
      failure_count_24h: p.job.failure_count_24h,
    }));

    try {
      await supabase.from("cron_watchdog_runs").insert({
        jobs_total: jobs.length,
        problems: problems.length,
        alerts_sent: alerts.length,
        dedup_skipped: dedupSkipped,
        delivered,
        delivery_error: deliveryError,
        min_failures: minFailures,
        stale_minutes: staleMinutes,
        details,
      });
    } catch (persistErr) {
      console.error(
        JSON.stringify({
          level: "warn",
          fn: "cron-watchdog",
          msg: "persist_failed",
          error: persistErr instanceof Error ? persistErr.message : String(persistErr),
        }),
      );
    }

    console.log(
      JSON.stringify({
        level: "info",
        fn: "cron-watchdog",
        msg: "evaluated",
        jobs_total: jobs.length,
        problems: problems.length,
        alerts_sent: alerts.length,
        dedup_skipped: dedupSkipped,
        delivered,
        delivery_error: deliveryError,
      }),
    );

    return json({
      ok: true,
      jobs_total: jobs.length,
      problems: problems.length,
      alerts_sent: alerts.length,
      dedup_skipped: dedupSkipped,
      delivered,
      delivery_error: deliveryError,
      details,
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        fn: "cron-watchdog",
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
