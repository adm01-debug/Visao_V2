// Executa a cada minuto (via pg_cron) e revalida RTSPs conforme rtsp_revalidation_schedules.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_BATCH = 25;

interface Row {
  id: string;
  camera_id: string;
  user_id: string;
  interval_minutes: number;
  targets: string[];
}

const log = (level: string, msg: string, meta: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, fn: "rtsp-revalidate-scheduler", msg, ...meta, ts: new Date().toISOString() }));
};

async function invokeValidate(cameraId: string, userId: string, target: "primary" | "substream") {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-rtsp-stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      "x-internal-invoke": "1",
      "x-internal-user-id": userId,
    },
    body: JSON.stringify({ camera_id: cameraId, target, samples: 3 }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, score: (body as { score?: string }).score ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(SUPABASE_URL, SERVICE);
  const now = new Date();

  const { data: due, error } = await admin
    .from("rtsp_revalidation_schedules")
    .select("id, camera_id, user_id, interval_minutes, targets")
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString())
    .order("next_run_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) {
    log("error", "query_failed", { err: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rows = (due ?? []) as Row[];
  let processed = 0;
  let succeeded = 0;

  for (const r of rows) {
    const targets = (Array.isArray(r.targets) && r.targets.length > 0
      ? r.targets
      : ["primary", "substream"]) as Array<"primary" | "substream">;

    const results: Record<string, unknown> = {};
    let anyFail = false;
    let worstScore: "ok" | "warn" | "critical" = "ok";
    for (const t of targets) {
      try {
        const r2 = await invokeValidate(r.camera_id, r.user_id, t);
        results[t] = r2;
        if (!r2.ok) anyFail = true;
        if (r2.score === "critical") worstScore = "critical";
        else if (r2.score === "warn" && worstScore !== "critical") worstScore = "warn";
      } catch (e) {
        anyFail = true;
        results[t] = { ok: false, error: (e as Error).message };
      }
    }

    const nextRun = new Date(Date.now() + r.interval_minutes * 60_000).toISOString();
    await admin
      .from("rtsp_revalidation_schedules")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun,
        last_status: anyFail ? "error" : worstScore,
        last_error: anyFail ? JSON.stringify(results).slice(0, 500) : null,
      })
      .eq("id", r.id);

    processed++;
    if (!anyFail) succeeded++;
  }

  log("info", "batch_done", { processed, succeeded });
  return new Response(JSON.stringify({ processed, succeeded }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
