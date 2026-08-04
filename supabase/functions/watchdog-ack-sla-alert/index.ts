// VISÃO — Alerta de SLA de ACK das escalações do Watchdog.
// Dispara Telegram quando a taxa de ACK em 24h fica abaixo do limiar
// com escalações suficientes para significância estatística.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getContractVersion, parseJsonBody, validatePayload } from "../_shared/contractValidation.ts";
import { WatchdogAckSlaAlertQuerySchema, WatchdogAckSlaAlertSchemaV1 } from "../_shared/webhookSchemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEDUP_MS = 6 * 60 * 60 * 1000; // 6h
let lastAlertAt = 0;

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
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const qValidation = validatePayload(WatchdogAckSlaAlertQuerySchema, rawParams, corsHeaders);
  if (!qValidation.success) return qValidation.response;
  let force = qValidation.data.force === "1";
  let minAck = qValidation.data.min_ack ?? 70; // % default
  let minEsc = qValidation.data.min_esc ?? 3;
  let mttaCapMin = qValidation.data.mtta_cap_min ?? 30;

  if (req.method === "POST") {
    const version = getContractVersion(req);
    const bodyResult = await parseJsonBody(req, 8_000, corsHeaders);
    if (!bodyResult.success) return bodyResult.response;
    const validation = validatePayload(WatchdogAckSlaAlertSchemaV1, bodyResult.data ?? {}, corsHeaders, version);
    if (!validation.success) return validation.response;
    const b = validation.data;
    if (b.force !== undefined) force = b.force;
    if (b.min_ack !== undefined) minAck = b.min_ack;
    if (b.min_esc !== undefined) minEsc = b.min_esc;
    if (b.mtta_cap_min !== undefined) mttaCapMin = b.mtta_cap_min;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Buscamos direto da tabela (service_role bypassa RLS) para 24h.
    const since24 = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: rows, error } = await supabase
      .from("cron_watchdog_escalations")
      .select("acknowledged_at, escalated_at")
      .gte("escalated_at", since24);
    if (error) throw error;

    const list = rows ?? [];
    const total = list.length;
    const ack = list.filter((r) => r.acknowledged_at).length;
    const ackRate = total ? (ack / total) * 100 : 100;
    const ackDurations = list
      .filter((r) => r.acknowledged_at)
      .map((r) => (new Date(r.acknowledged_at as string).getTime() - new Date(r.escalated_at as string).getTime()) / 1000);
    const mtta = ackDurations.length
      ? ackDurations.reduce((a, b) => a + b, 0) / ackDurations.length
      : null;

    const breachAck = total >= minEsc && ackRate < minAck;
    const breachMtta = mtta !== null && mtta > mttaCapMin * 60;
    const shouldAlert = breachAck || breachMtta;
    const dedupSkipped = !force && shouldAlert && Date.now() - lastAlertAt < DEDUP_MS;

    if (!shouldAlert || dedupSkipped) {
      return json({
        ok: true,
        alerted: false,
        dedup_skipped: dedupSkipped,
        total,
        ack_rate: Number(ackRate.toFixed(2)),
        mtta_seconds: mtta,
      });
    }

    let delivered = false;
    let deliveryError: string | null = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const reasons: string[] = [];
      if (breachAck) reasons.push(`Taxa de ACK <b>${ackRate.toFixed(1)}%</b> (meta ≥ ${minAck}%)`);
      if (breachMtta && mtta !== null) reasons.push(`MTTA <b>${(mtta / 60).toFixed(1)}min</b> (cap ${mttaCapMin}min)`);
      const text =
        `⏱️ <b>VISÃO — SLA de ACK degradado</b>\n\n` +
        `Janela: últimas <b>24h</b>\n` +
        `Escalações: <b>${total}</b> · Reconhecidas: <b>${ack}</b>\n\n` +
        reasons.map((r) => `• ${r}`).join("\n") +
        `\n\n_Verifique disponibilidade da equipe de plantão._`;

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
      if (delivered) lastAlertAt = Date.now();
    } else {
      deliveryError = "telegram_not_configured";
    }

    console.log(JSON.stringify({
      level: "warn",
      fn: "watchdog-ack-sla-alert",
      msg: "sla_breach",
      total,
      ack,
      ack_rate: ackRate,
      mtta_seconds: mtta,
      breach_ack: breachAck,
      breach_mtta: breachMtta,
      delivered,
      delivery_error: deliveryError,
    }));

    return json({
      ok: true,
      alerted: true,
      delivered,
      delivery_error: deliveryError,
      total,
      ack_rate: Number(ackRate.toFixed(2)),
      mtta_seconds: mtta,
    });
  } catch (e) {
    console.error(JSON.stringify({
      level: "error",
      fn: "watchdog-ack-sla-alert",
      error: e instanceof Error ? e.message : String(e),
    }));
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
