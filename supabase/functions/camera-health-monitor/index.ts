// Wave Sentinel 1 — Camera health monitor
// Avalia as últimas sondagens salvas em stream_health_checks, atualiza
// camera_health_state e dispara alertas de câmera offline / recuperada.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Regras
const FAIL_THRESHOLD = 3; // 3 checks seguidos falhos => offline
const RECOVERY_THRESHOLD = 2; // 2 checks seguidos ok => online
const ALERT_COOLDOWN_MIN = 30; // não repete alerta de offline antes de 30 min
const RECENT_WINDOW_MIN = 30; // olhar últimos 30 min de checks

type CheckRow = {
  camera_id: string;
  user_id: string;
  status: 'ok' | 'fail';
  latency_ms: number;
  http_code: number;
  message: string | null;
  created_at: string;
};

type StateRow = {
  camera_id: string;
  user_id: string;
  state: 'online' | 'degraded' | 'offline' | 'unknown';
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_at: string | null;
  last_state_change_at: string;
  last_alert_at: string | null;
};

type CameraRow = { id: string; user_id: string; name: string };

const log = (level: 'info' | 'warn' | 'error', msg: string, meta: Record<string, unknown> = {}) => {
  console.log(
    JSON.stringify({
      level,
      fn: 'camera-health-monitor',
      msg,
      ...meta,
      ts: new Date().toISOString(),
    })
  );
};

async function sendNotification(payload: {
  alertId: string;
  cameraName: string;
  userId: string;
  type: 'offline' | 'recovered';
  severity: 'medium' | 'high' | 'critical';
  message: string;
}) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Busca a primeira config habilitada do usuário
    const { data: cfg } = await supabase
      .from('notification_configs')
      .select(
        'channels, email_recipients, phone_recipients, webhook_urls, enabled, severity_filter'
      )
      .eq('user_id', payload.userId)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle();

    const channels: string[] =
      Array.isArray(cfg?.channels) && cfg!.channels.length > 0
        ? cfg!.channels.filter((c: string) => ['email', 'telegram', 'webhook', 'push'].includes(c))
        : [];

    if (channels.length === 0) {
      log('info', 'no_channels_configured', { user_id: payload.userId });
      return;
    }

    // Respeita severity_filter, se definido
    if (
      Array.isArray(cfg?.severity_filter) &&
      cfg!.severity_filter.length > 0 &&
      !cfg!.severity_filter.includes(payload.severity)
    ) {
      log('info', 'severity_filtered_out', { severity: payload.severity });
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-alert-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': payload.alertId,
      },
      body: JSON.stringify({
        alertId: payload.alertId,
        type: `camera_${payload.type}`,
        severity: payload.severity,
        message: payload.message,
        cameraName: payload.cameraName,
        timestamp: new Date().toISOString(),
        channels,
        recipients: {
          emails: cfg?.email_recipients ?? [],
          phones: cfg?.phone_recipients ?? [],
          webhookUrls: cfg?.webhook_urls ?? [],
        },
      }),
    });
    if (!res.ok) {
      log('warn', 'notify_non_ok', { status: res.status, body: await res.text() });
    }
  } catch (e) {
    log('error', 'notify_error', { err: (e as Error).message });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const since = new Date(Date.now() - RECENT_WINDOW_MIN * 60_000).toISOString();

    const { data: cameras, error: camErr } = await supabase
      .from('cameras')
      .select('id, user_id, name');
    if (camErr) throw camErr;
    const camList = (cameras ?? []) as CameraRow[];
    if (camList.length === 0) {
      return new Response(JSON.stringify({ evaluated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const camIds = camList.map((c) => c.id);
    const camById = new Map(camList.map((c) => [c.id, c]));

    // Checks recentes (ordenados por câmera, mais novo primeiro)
    const { data: checks, error: chkErr } = await supabase
      .from('stream_health_checks')
      .select('camera_id, user_id, status, latency_ms, http_code, message, created_at')
      .in('camera_id', camIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (chkErr) throw chkErr;

    const byCam = new Map<string, CheckRow[]>();
    for (const row of (checks ?? []) as CheckRow[]) {
      const arr = byCam.get(row.camera_id) ?? [];
      if (arr.length < 5) arr.push(row);
      byCam.set(row.camera_id, arr);
    }

    // Estado atual
    const { data: states, error: stErr } = await supabase
      .from('camera_health_state')
      .select('*')
      .in('camera_id', camIds);
    if (stErr) throw stErr;
    const stateByCam = new Map<string, StateRow>();
    for (const s of (states ?? []) as StateRow[]) stateByCam.set(s.camera_id, s);

    let transitions = 0;
    let alertsSent = 0;
    const upserts: Array<Partial<StateRow> & { camera_id: string; user_id: string }> = [];

    for (const cam of camList) {
      const recent = byCam.get(cam.id) ?? [];
      const prev = stateByCam.get(cam.id);
      const latest = recent[0];

      // Sem dados recentes: mantém como unknown e segue
      if (!latest) {
        if (!prev) {
          upserts.push({
            camera_id: cam.id,
            user_id: cam.user_id,
            state: 'unknown',
            consecutive_failures: 0,
            consecutive_successes: 0,
          });
        }
        continue;
      }

      // Conta streak a partir do mais recente
      let failStreak = 0;
      let okStreak = 0;
      for (const c of recent) {
        if (c.status === 'fail') {
          if (okStreak > 0) break;
          failStreak++;
        } else {
          if (failStreak > 0) break;
          okStreak++;
        }
      }

      let nextState: StateRow['state'] = prev?.state ?? 'unknown';
      if (failStreak >= FAIL_THRESHOLD) nextState = 'offline';
      else if (failStreak > 0) nextState = 'degraded';
      else if (okStreak >= RECOVERY_THRESHOLD) nextState = 'online';
      else if (okStreak > 0 && (!prev || prev.state === 'unknown')) nextState = 'online';

      const prevState = prev?.state ?? 'unknown';
      const now = new Date().toISOString();
      const changed = nextState !== prevState;

      const base = {
        camera_id: cam.id,
        user_id: cam.user_id,
        state: nextState,
        consecutive_failures: failStreak,
        consecutive_successes: okStreak,
        last_check_at: latest.created_at,
        last_latency_ms: latest.latency_ms,
        last_http_code: latest.http_code,
        last_message: latest.message,
        last_state_change_at: changed ? now : (prev?.last_state_change_at ?? now),
      };

      // Alertas — transições relevantes
      const shouldAlertOffline =
        nextState === 'offline' &&
        (prevState !== 'offline' ||
          !prev?.last_alert_at ||
          Date.now() - new Date(prev.last_alert_at).getTime() >= ALERT_COOLDOWN_MIN * 60_000);

      const shouldAlertRecovery = nextState === 'online' && prevState === 'offline';

      if (shouldAlertOffline || shouldAlertRecovery) {
        transitions += changed ? 1 : 0;
        const type: 'offline' | 'recovered' = shouldAlertOffline ? 'offline' : 'recovered';
        const severity: 'medium' | 'high' | 'critical' = type === 'offline' ? 'high' : 'medium';
        const message =
          type === 'offline'
            ? `Câmera ${cam.name} está offline (${failStreak} falhas consecutivas · ${latest.message ?? `HTTP ${latest.http_code}`}).`
            : `Câmera ${cam.name} voltou a responder normalmente.`;

        // Persiste alerta
        const { data: alertRow, error: alErr } = await supabase
          .from('alerts')
          .insert({
            user_id: cam.user_id,
            camera_id: cam.id,
            camera_name: cam.name,
            type: 'camera_offline',
            severity: type === 'offline' ? 'high' : 'low',
            message,
            timestamp: now,
          })
          .select('id')
          .single();

        if (alErr) {
          log('warn', 'alert_insert_failed', { err: alErr.message, camera_id: cam.id });
        } else {
          alertsSent++;
          await sendNotification({
            alertId: alertRow!.id as string,
            cameraName: cam.name,
            userId: cam.user_id,
            type,
            severity,
            message,
          });
          (base as StateRow).last_alert_at = now;
        }
      }

      upserts.push(base);
    }

    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from('camera_health_state')
        .upsert(upserts, { onConflict: 'camera_id' });
      if (upErr) throw upErr;
    }

    log('info', 'monitor_batch', { evaluated: camList.length, transitions, alertsSent });

    return new Response(
      JSON.stringify({ evaluated: camList.length, transitions, alerts: alertsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    log('error', 'monitor_error', { err: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
