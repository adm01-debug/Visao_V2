// Alerta automático quando o score do stream permanece "critical" em 2+ validações consecutivas.
// Usa camera_health_state.consecutive_critical_scores + last_critical_alert_at para cooldown.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { Suggestion } from './suggestions.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const DEFAULT_COOLDOWN_MIN = 30;
const DEFAULT_CONSECUTIVE_THRESHOLD = 2;

async function resolveThresholds(
  admin: SupabaseClient,
  userId: string,
  cameraId: string
): Promise<{ streak: number; cooldownMin: number }> {
  const { data } = await admin
    .from('stream_alert_thresholds')
    .select('consecutive_threshold, cooldown_minutes, camera_id')
    .eq('user_id', userId)
    .or(`camera_id.eq.${cameraId},camera_id.is.null`);
  const rows = data ?? [];
  const cam = rows.find((r) => r.camera_id === cameraId);
  const usr = rows.find((r) => r.camera_id === null);
  const pick = cam ?? usr;
  return {
    streak: pick?.consecutive_threshold ?? DEFAULT_CONSECUTIVE_THRESHOLD,
    cooldownMin: pick?.cooldown_minutes ?? DEFAULT_COOLDOWN_MIN,
  };
}

export interface CriticalAlertInput {
  userId: string;
  cameraId: string;
  score: 'ok' | 'warn' | 'critical';
  latencyAvg: number;
  jitter: number;
  lossPct: number;
  suggestions: Suggestion[];
}

export async function maybeAlertCriticalScore(
  admin: SupabaseClient,
  input: CriticalAlertInput
): Promise<{ alerted: boolean; reason: string; streak: number }> {
  const { userId, cameraId, score } = input;
  const { streak: CONSECUTIVE_THRESHOLD, cooldownMin: COOLDOWN_MIN } = await resolveThresholds(
    admin,
    userId,
    cameraId
  );

  const { data: state } = await admin
    .from('camera_health_state')
    .select('consecutive_critical_scores, last_critical_alert_at')
    .eq('camera_id', cameraId)
    .maybeSingle();

  const prevStreak = state?.consecutive_critical_scores ?? 0;
  const nextStreak = score === 'critical' ? prevStreak + 1 : 0;

  await admin.from('camera_health_state').upsert(
    {
      camera_id: cameraId,
      user_id: userId,
      consecutive_critical_scores: nextStreak,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'camera_id' }
  );

  if (score !== 'critical') {
    return { alerted: false, reason: 'score_not_critical', streak: nextStreak };
  }
  if (nextStreak < CONSECUTIVE_THRESHOLD) {
    return { alerted: false, reason: 'streak_below_threshold', streak: nextStreak };
  }

  const lastAlertAt = state?.last_critical_alert_at
    ? new Date(state.last_critical_alert_at).getTime()
    : 0;
  const ageMin = (Date.now() - lastAlertAt) / 60_000;
  if (lastAlertAt && ageMin < COOLDOWN_MIN) {
    return {
      alerted: false,
      reason: `cooldown_active_${Math.round(COOLDOWN_MIN - ageMin)}m`,
      streak: nextStreak,
    };
  }

  // Buscar câmera + configuração de notificação
  const [{ data: cam }, { data: cfg }] = await Promise.all([
    admin.from('cameras').select('id, name').eq('id', cameraId).maybeSingle(),
    admin
      .from('notification_configs')
      .select(
        'channels, email_recipients, phone_recipients, webhook_urls, enabled, severity_filter'
      )
      .eq('user_id', userId)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const allChannels: string[] = Array.isArray(cfg?.channels)
    ? (cfg!.channels as string[]).filter((c) =>
        ['email', 'telegram', 'webhook', 'push'].includes(c)
      )
    : [];
  if (allChannels.length === 0) {
    return { alerted: false, reason: 'no_channels_configured', streak: nextStreak };
  }
  if (
    Array.isArray(cfg?.severity_filter) &&
    cfg!.severity_filter.length > 0 &&
    !(cfg!.severity_filter as string[]).includes('critical')
  ) {
    return { alerted: false, reason: 'severity_filtered_out', streak: nextStreak };
  }

  const topSuggestion =
    input.suggestions.find((s) => s.severity === 'critical') ?? input.suggestions[0];
  const cameraName = cam?.name ?? 'Câmera';
  const alertId = `stream-critical-${cameraId}-${Date.now()}`;
  const message = [
    `Stream em estado CRÍTICO por ${nextStreak} validações consecutivas.`,
    `Latência média: ${Math.round(input.latencyAvg)} ms · Jitter: ${Math.round(input.jitter)} ms · Perda: ${input.lossPct.toFixed(0)}%.`,
    topSuggestion ? `Diagnóstico: ${topSuggestion.message}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-alert-notification`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      'x-idempotency-key': alertId,
    },
    body: JSON.stringify({
      alertId,
      type: 'stream_critical',
      severity: 'critical',
      message,
      cameraName,
      timestamp: new Date().toISOString(),
      channels: allChannels,
      recipients: {
        emails: cfg?.email_recipients ?? [],
        phones: cfg?.phone_recipients ?? [],
        webhookUrls: cfg?.webhook_urls ?? [],
      },
    }),
  });

  if (!res.ok) {
    return { alerted: false, reason: `notify_http_${res.status}`, streak: nextStreak };
  }

  // Registrar alerta enviado (cooldown) — reseta o streak para não spammar
  await admin
    .from('camera_health_state')
    .update({
      last_critical_alert_at: new Date().toISOString(),
      consecutive_critical_scores: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('camera_id', cameraId);

  // Persistir no histórico de alertas
  await admin
    .from('alerts')
    .insert({
      user_id: userId,
      camera_id: cameraId,
      camera_name: cameraName,
      type: 'stream_critical',
      severity: 'critical',
      message,
      timestamp: new Date().toISOString(),
    })
    .then(
      () => null,
      () => null
    );

  return { alerted: true, reason: 'sent', streak: nextStreak };
}
