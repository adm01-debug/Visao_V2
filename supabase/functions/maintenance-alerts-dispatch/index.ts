// VISÃO — Onda 111: despacho externo dos alertas de manutenção do banco.
//
// A Onda 110 passou a detectar rotinas noturnas paradas ou falhando. Detectar
// sem avisar ninguém é só telemetria bonita: esta função lê os alertas abertos,
// aplica a política pura de despacho (dedup, backoff, teto de tentativas) e
// entrega pelos canais externos configurados, registrando tudo para auditoria.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  planDispatch,
  renderMessage,
  resolveConfig,
  type DispatchChannel,
  type DispatchConfig,
  type DispatchPlanItem,
  type MaintenanceAlert,
} from "../_shared/maintenanceDispatchPolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ level, fn: "maintenance-alerts-dispatch", msg, ...extra }));

/** Envia pelo Telegram. Retorna `null` em sucesso ou o motivo da falha. */
async function sendTelegram(item: DispatchPlanItem): Promise<string | null> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return "telegram_not_configured";

  const { html } = renderMessage(item.alert);
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return resp.ok ? null : `telegram_http_${resp.status}`;
  } catch (err) {
    return `telegram_exception_${err instanceof Error ? err.name : "unknown"}`;
  }
}

/** Envia por e-mail (Resend). Retorna `null` em sucesso ou o motivo da falha. */
async function sendEmail(item: DispatchPlanItem): Promise<string | null> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("MAINTENANCE_ALERT_EMAIL");
  if (!apiKey || !to) return "email_not_configured";

  const from = Deno.env.get("MAINTENANCE_ALERT_FROM") ?? "VISÃO <onboarding@resend.dev>";
  const { subject, text, html } = renderMessage(item.alert);
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: `<pre style="font-family:ui-monospace,monospace">${html}</pre>`,
      }),
    });
    return resp.ok ? null : `email_http_${resp.status}`;
  } catch (err) {
    return `email_exception_${err instanceof Error ? err.name : "unknown"}`;
  }
}

const SENDERS: Record<DispatchChannel, (item: DispatchPlanItem) => Promise<string | null>> = {
  telegram: sendTelegram,
  email: sendEmail,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    log("error", "missing_service_credentials");
    return json({ ok: false, error: "service_unavailable" }, 500);
  }

  // Overrides opcionais (uso manual/QA): { dry_run, min_severity, channels, batch_limit }
  let overrides: Partial<DispatchConfig> & { dryRun?: boolean } = {};
  if (req.method === "POST") {
    try {
      const body = await req.json();
      overrides = {
        dryRun: Boolean(body?.dry_run),
        ...(body?.min_severity === "warning" || body?.min_severity === "critical"
          ? { minSeverity: body.min_severity }
          : {}),
        ...(Array.isArray(body?.channels) ? { channels: body.channels as DispatchChannel[] } : {}),
        ...(typeof body?.batch_limit === "number"
          ? { batchLimit: Math.max(1, Math.min(100, Math.trunc(body.batch_limit))) }
          : {}),
      };
    } catch {
      /* corpo vazio é o caso normal do cron */
    }
  }
  const { dryRun = false, ...configOverrides } = overrides;
  const config = resolveConfig(Deno.env.toObject(), configOverrides);

  if (config.channels.length === 0) {
    log("warn", "no_channels_configured");
    return json({ ok: true, dispatched: 0, reason: "no_channels_configured" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const since = new Date(Date.now() - config.maxAgeHours * 3_600_000).toISOString();

  try {
    const { data: alertRows, error: alertsError } = await supabase
      .from("maintenance_alert_events")
      .select("id, routine, severity, reason, created_at, detail")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (alertsError) throw alertsError;

    const alerts = (alertRows ?? []) as MaintenanceAlert[];
    if (alerts.length === 0) return json({ ok: true, dispatched: 0, candidates: 0 });

    const { data: dispatchRows, error: dispatchError } = await supabase
      .from("maintenance_alert_dispatches")
      .select("alert_id, channel, status, attempts, last_attempt_at")
      .in("alert_id", alerts.map((a) => a.id));
    if (dispatchError) throw dispatchError;

    const plan = planDispatch(alerts, dispatchRows ?? [], config, Date.now());

    if (dryRun) {
      return json({
        ok: true,
        dry_run: true,
        planned: plan.items.map((i) => ({ alert_id: i.alert.id, channel: i.channel, attempt: i.attempt })),
        skipped: plan.skipped,
      });
    }

    let sent = 0;
    let failed = 0;

    for (const item of plan.items) {
      const error = await SENDERS[item.channel](item);
      if (error === null) sent += 1;
      else failed += 1;

      const { error: upsertError } = await supabase
        .from("maintenance_alert_dispatches")
        .upsert(
          {
            alert_id: item.alert.id,
            channel: item.channel,
            status: error === null ? "sent" : "failed",
            attempts: item.attempt,
            last_attempt_at: new Date().toISOString(),
            last_error: error,
            detail: { routine: item.alert.routine, severity: item.alert.severity },
          },
          { onConflict: "alert_id,channel" },
        );
      if (upsertError) {
        log("error", "dispatch_audit_failed", { alert_id: item.alert.id, err: upsertError.message });
      }
    }

    log(failed > 0 ? "warn" : "info", "dispatch_done", {
      candidates: alerts.length,
      planned: plan.items.length,
      sent,
      failed,
      skipped: plan.skipped.length,
    });

    return json({ ok: true, candidates: alerts.length, dispatched: sent, failed, skipped: plan.skipped.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    log("error", "dispatch_failed", { err: message });
    return json({ ok: false, error: message }, 500);
  }
});
