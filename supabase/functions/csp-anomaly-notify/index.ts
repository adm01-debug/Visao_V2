// Onda 67 — Notificação de anomalias CSP via Telegram (opt-in por secrets)
// Consulta audit_logs para eventos security.csp_anomaly recentes ainda não
// notificados e envia mensagem consolidada. Idempotente via flag notified_at
// gravada no próprio registro (new_values.notified_at).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOT_TOKEN = Deno.env.get('CSP_ALERT_TELEGRAM_BOT_TOKEN') ?? '';
const CHAT_ID = Deno.env.get('CSP_ALERT_TELEGRAM_CHAT_ID') ?? '';
const RETENTION_SECRET = Deno.env.get('RETENTION_SECRET') ?? '';

interface AnomalyRow {
  id: string;
  created_at: string;
  new_values: Record<string, unknown> | null;
}

function esc(s: string): string {
  return s.replace(
    /[<>&]/g,
    (c) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }) as Record<string, string>)[c]!
  );
}

async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || !CHAT_ID) return { ok: false, error: 'telegram_not_configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j?.ok === false)
      return { ok: false, error: j?.description ?? `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  // Autorização opcional: se RETENTION_SECRET estiver definido e o header
  // x-cron-secret NÃO bater, rejeita. Caso contrário aceita (function é
  // verify_jwt=false para permitir chamada via pg_cron/net.http_post).
  // Como side-effects são idempotentes (marca notified_at), o risco de abuso
  // é limitado a notificações Telegram já enviadas.
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (RETENTION_SECRET && provided !== RETENTION_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, created_at, new_values')
    .eq('action', 'security.csp_anomaly')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rows = (data ?? []) as AnomalyRow[];
  const pending = rows.filter((r) => !r.new_values || !('notified_at' in r.new_values));

  if (pending.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, pending: 0, telegram_configured: Boolean(BOT_TOKEN && CHAT_ID) }),
      { headers: { 'content-type': 'application/json' } }
    );
  }

  const telegramReady = Boolean(BOT_TOKEN && CHAT_ID);
  let sent = 0;
  const errors: string[] = [];

  for (const row of pending) {
    const v = row.new_values ?? {};
    const lastHour = Number(v.last_hour ?? 0);
    const ratio = Number(v.ratio ?? 0);
    const directive = String(v.top_directive ?? 'unknown');
    const blocked = String(v.top_blocked ?? 'unknown');
    const msg =
      `🚨 <b>Anomalia CSP detectada</b>\n` +
      `Ratio: <b>${ratio.toFixed(2)}×</b> baseline\n` +
      `Última hora: <b>${lastHour}</b> violações\n` +
      `Diretiva: <code>${esc(directive)}</code>\n` +
      `Blocked URI: <code>${esc(blocked.slice(0, 200))}</code>\n` +
      `Detectado: ${new Date(row.created_at).toISOString()}`;

    let notifiedOk = true;
    if (telegramReady) {
      const r = await sendTelegram(msg);
      if (!r.ok) {
        notifiedOk = false;
        errors.push(`${row.id}: ${r.error}`);
      } else {
        sent++;
      }
    }

    // Marcar como notificado (mesmo sem Telegram para não reprocessar infinitamente)
    const merged = {
      ...(row.new_values ?? {}),
      notified_at: new Date().toISOString(),
      notified_via: telegramReady ? 'telegram' : 'none',
      notified_ok: notifiedOk,
    };
    await supabase.from('audit_logs').update({ new_values: merged }).eq('id', row.id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      pending: pending.length,
      sent,
      telegram_configured: telegramReady,
      errors: errors.slice(0, 5),
    }),
    { headers: { 'content-type': 'application/json' } }
  );
});
