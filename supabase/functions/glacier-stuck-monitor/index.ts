// Wave Storage 14 — Glacier Stuck Monitor
// Cron-invoked edge function that finds Glacier restores stuck > 12h and alerts via Telegram.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: pending, error } = await supabase.rpc('find_glacier_stuck_pending_alert', {
      _hours_threshold: 12,
      _dedup_window_hours: 6,
    });
    if (error) throw error;

    const list = (pending ?? []) as Array<{ asset_id: string; user_id: string; object_key: string; hours_stuck: number }>;

    if (list.length === 0) {
      return new Response(JSON.stringify({ alerted: 0, message: 'no stuck restores' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let delivered = 0;
    const errors: string[] = [];

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const lines = list.slice(0, 20).map(
        (r) => `• \`${r.object_key.slice(0, 50)}\` — ${r.hours_stuck}h presa`
      );
      const text =
        `🚨 *VISÃO — Glacier Restore Stuck*\n\n` +
        `${list.length} restauração(ões) presa(s) > 12h:\n\n` +
        lines.join('\n') +
        (list.length > 20 ? `\n\n_+${list.length - 20} outras_` : '');

      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
      });

      if (tgRes.ok) delivered = list.length;
      else errors.push(`telegram_${tgRes.status}: ${await tgRes.text()}`);
    } else {
      errors.push('telegram_not_configured');
    }

    // Registrar alertas (mesmo se falharam, para não spammar)
    const rows = list.map((r) => ({
      asset_id: r.asset_id,
      hours_stuck: r.hours_stuck,
      channel: 'telegram',
      delivered: delivered > 0,
      error_message: errors[0] ?? null,
    }));
    const { error: insertError } = await supabase.from('glacier_stuck_alerts').insert(rows);
    if (insertError) console.error('insert alert error', insertError);

    return new Response(
      JSON.stringify({ found: list.length, delivered, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('glacier-stuck-monitor error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
