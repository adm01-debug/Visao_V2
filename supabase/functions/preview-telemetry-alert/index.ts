// Onda Preview-Telemetry 3 — Monitor de queda na taxa de sucesso das prévias.
// Executado por pg_cron a cada 15 min. Dispara alerta Telegram com dedup de 1h.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { validatePayload } from '../_shared/contractValidation.ts';
import { PreviewTelemetryAlertQuerySchema } from '../_shared/webhookSchemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRow {
  window_hours: number;
  total_started: number;
  total_failed: number;
  total_relevant: number;
  success_rate: number | null;
  threshold_used: number;
  should_alert: boolean;
  generated_at: string;
}

// Dedup em memória do isolate — reforçado pela janela do próprio alerta.
let lastAlertAt = 0;
const DEDUP_MS = 60 * 60 * 1000; // 1h

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  // Validate bounded numeric params — prevents NaN/Infinity injection via z.coerce + .finite()
  const rawParams: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== 'force') rawParams[k] = v;
  }
  const qValidation = validatePayload(PreviewTelemetryAlertQuerySchema, rawParams, corsHeaders);
  if (!qValidation.success) return qValidation.response;
  const windowHours = qValidation.data.window ?? 1;
  const minEvents = qValidation.data.min ?? 50;
  const threshold = qValidation.data.threshold ?? 0.9;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data, error } = await supabase.rpc('preview_success_alert', {
      p_window_hours: windowHours,
      p_min_events: minEvents,
      p_threshold: threshold,
    });
    if (error) throw error;

    const row = Array.isArray(data)
      ? (data[0] as AlertRow | undefined)
      : (data as AlertRow | undefined);
    if (!row) {
      return json({ ok: true, evaluated: 0, message: 'no_data' });
    }

    const shouldAlert = row.should_alert === true;
    const dedupSkipped = !force && shouldAlert && Date.now() - lastAlertAt < DEDUP_MS;

    if (!shouldAlert || dedupSkipped) {
      console.log(
        JSON.stringify({
          level: 'info',
          fn: 'preview-telemetry-alert',
          msg: 'evaluated',
          should_alert: shouldAlert,
          dedup_skipped: dedupSkipped,
          started: row.total_started,
          failed: row.total_failed,
          rate: row.success_rate,
          threshold: row.threshold_used,
        })
      );
      return json({ ok: true, alerted: false, dedup_skipped: dedupSkipped, row });
    }

    let delivered = false;
    let deliveryError: string | null = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const ratePct = row.success_rate != null ? (row.success_rate * 100).toFixed(1) : '—';
      const thrPct = (row.threshold_used * 100).toFixed(0);
      const text =
        `⚠️ *VISÃO — Prévias ao vivo com falha elevada*\n\n` +
        `Janela: últimas *${row.window_hours}h*\n` +
        `Sucesso: *${ratePct}%* (meta: ≥ ${thrPct}%)\n` +
        `Iniciadas: ${row.total_started} · Falhas: ${row.total_failed}\n\n` +
        `_Verifique MediaMTX, upstream RTSP e taxa de erros por codec/navegador._`;

      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
      });
      if (tgRes.ok) {
        delivered = true;
        lastAlertAt = Date.now();
      } else {
        deliveryError = `telegram_${tgRes.status}`;
        console.error(await tgRes.text());
      }
    } else {
      deliveryError = 'telegram_not_configured';
    }

    console.log(
      JSON.stringify({
        level: delivered ? 'warn' : 'error',
        fn: 'preview-telemetry-alert',
        msg: 'alert_fired',
        delivered,
        deliveryError,
        rate: row.success_rate,
        threshold: row.threshold_used,
        started: row.total_started,
        failed: row.total_failed,
      })
    );

    return json({ ok: true, alerted: true, delivered, deliveryError, row });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({ level: 'error', fn: 'preview-telemetry-alert', msg: 'monitor_error', err })
    );
    return json({ ok: false, error: err }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
