// VISÃO — Monitor de saúde do assistente de conectividade.
// Dispara alerta no Telegram quando taxa de sucesso cai abaixo do limiar
// com amostra mínima. Ideal para agendamento via pg_cron a cada 30-60 min.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dedup em memória do isolate (reforçada por janela do alerta).
let lastAlertAt = 0;
const DEDUP_MS = 60 * 60 * 1000; // 1h

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
  const windowHours = Math.max(1, Math.min(168, Number(url.searchParams.get("window") ?? "24")));
  const minEvents = Math.max(5, Math.min(10_000, Number(url.searchParams.get("min") ?? "10")));
  const threshold = Math.max(0.1, Math.min(0.99, Number(url.searchParams.get("th") ?? "0.6")));
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
    const { data, error } = await supabase
      .from("connectivity_resolution_telemetry")
      .select("succeeded, chosen_path")
      .gte("created_at", since)
      .neq("chosen_path", "cancelled")
      .limit(5000);
    if (error) throw error;

    const rows = data ?? [];
    const total = rows.length;
    const succeeded = rows.filter((r) => r.succeeded === true).length;
    const failed = rows.filter((r) => r.succeeded === false).length;
    const rate = total ? succeeded / total : null;

    const shouldAlert = total >= minEvents && rate !== null && rate < threshold;
    const dedupSkipped = !force && shouldAlert && Date.now() - lastAlertAt < DEDUP_MS;

    if (!shouldAlert || dedupSkipped) {
      console.log(
        JSON.stringify({
          level: "info",
          fn: "connectivity-resolution-alert",
          msg: "evaluated",
          should_alert: shouldAlert,
          dedup_skipped: dedupSkipped,
          total,
          succeeded,
          failed,
          rate,
          threshold,
        }),
      );
      return json({ ok: true, alerted: false, dedup_skipped: dedupSkipped, total, rate, threshold });
    }

    let delivered = false;
    let deliveryError: string | null = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const ratePct = rate !== null ? (rate * 100).toFixed(1) : "—";
      const thrPct = (threshold * 100).toFixed(0);
      const text =
        `⚠️ *VISÃO — Assistente de conectividade degradado*\n\n` +
        `Janela: últimas *${windowHours}h*\n` +
        `Sucesso: *${ratePct}%* (meta: ≥ ${thrPct}%)\n` +
        `Tentativas: ${total} · Falhas: ${failed}\n\n` +
        `_Verifique agentes locais offline, VPNs instáveis e regras de port-forward incorretas._`;

      const tgRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "Markdown" }),
        },
      );
      if (tgRes.ok) {
        delivered = true;
        lastAlertAt = Date.now();
      } else {
        deliveryError = `telegram_${tgRes.status}`;
      }
      await tgRes.text().catch(() => "");
    } else {
      deliveryError = "telegram_not_configured";
    }

    console.log(
      JSON.stringify({
        level: "warn",
        fn: "connectivity-resolution-alert",
        msg: "alert_triggered",
        delivered,
        delivery_error: deliveryError,
        total,
        rate,
        threshold,
      }),
    );

    return json({ ok: true, alerted: true, delivered, delivery_error: deliveryError, total, rate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error(
      JSON.stringify({ level: "error", fn: "connectivity-resolution-alert", msg: message }),
    );
    return json({ ok: false, error: message }, 500);
  }
});
