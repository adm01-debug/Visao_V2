// Onda Fortress 7 — Vault Coverage Watchdog
// Cron-invoked (a cada 15 min). Se cobertura KEK for `critical`, dispara alerta
// Telegram e grava linha em `camera_vault_audit` para rastreabilidade.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { validatePayload } from '../_shared/contractValidation.ts';
import { VaultCoverageWatchdogQuerySchema } from '../_shared/webhookSchemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoverageRow {
  total: number;
  enveloped: number;
  legacy: number;
  oldest_wrap: string | null;
  severity: 'ok' | 'warn' | 'critical';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const rawParams = Object.fromEntries(new URL(req.url).searchParams.entries());
  const qValidation = validatePayload(VaultCoverageWatchdogQuerySchema, rawParams, corsHeaders);
  if (!qValidation.success) return qValidation.response;

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const TG_BOT = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TG_CHAT = Deno.env.get('TELEGRAM_CHAT_ID');
  const DEDUP_MIN = parseInt(Deno.env.get('VAULT_WATCHDOG_DEDUP_MIN') ?? '60', 10);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const audit = async (
    success: boolean,
    error_code: string | null,
    metadata: Record<string, unknown>
  ) => {
    try {
      await admin.from('camera_vault_audit').insert({
        actor_id: null,
        actor_role: 'system',
        action: 'watchdog_tick',
        success,
        error_code,
        metadata,
      });
    } catch (_) {
      /* best-effort */
    }
  };

  try {
    const { data, error } = await admin
      .from('camera_vault_coverage_alerts')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    const cov = (data as CoverageRow | null) ?? {
      total: 0,
      enveloped: 0,
      legacy: 0,
      oldest_wrap: null,
      severity: 'ok',
    };

    if (cov.severity !== 'critical') {
      await audit(true, null, { severity: cov.severity, legacy: cov.legacy, total: cov.total });
      return new Response(JSON.stringify({ ok: true, severity: cov.severity, alerted: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dedup: só alerta se não houve alerta bem-sucedido no último DEDUP_MIN
    const since = new Date(Date.now() - DEDUP_MIN * 60_000).toISOString();
    const { data: recent } = await admin
      .from('camera_vault_audit')
      .select('id')
      .eq('action', 'watchdog_alert')
      .eq('success', true)
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) {
      await audit(true, 'deduped', { severity: cov.severity });
      return new Response(
        JSON.stringify({ ok: true, severity: 'critical', alerted: false, deduped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let delivered = false;
    let errCode: string | null = null;

    if (TG_BOT && TG_CHAT) {
      const oldestTxt = cov.oldest_wrap ? new Date(cov.oldest_wrap).toISOString() : 'n/a';
      const text =
        `🚨 *VISÃO — Vault Coverage CRITICAL*\n\n` +
        `Envelopadas: *${cov.enveloped}/${cov.total}*\n` +
        `Legadas: *${cov.legacy}*\n` +
        `Wrap mais antigo: \`${oldestTxt}\`\n\n` +
        `Executar backfill em lotes via UI → OperationsPage → EnvelopeEncryptionCard.`;
      try {
        const res = await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
        });
        if (res.ok) delivered = true;
        else errCode = `telegram_${res.status}`;
      } catch (e) {
        errCode = `telegram_exception:${(e as Error).message.slice(0, 60)}`;
      }
    } else {
      errCode = 'telegram_not_configured';
    }

    await admin.from('camera_vault_audit').insert({
      actor_id: null,
      actor_role: 'system',
      action: 'watchdog_alert',
      success: delivered,
      error_code: errCode,
      affected_rows: cov.legacy,
      metadata: {
        severity: cov.severity,
        total: cov.total,
        enveloped: cov.enveloped,
        legacy: cov.legacy,
        oldest_wrap: cov.oldest_wrap,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, severity: 'critical', alerted: delivered, error: errCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const msg = (e as Error).message ?? 'unknown';
    await audit(false, msg.slice(0, 200), {});
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
