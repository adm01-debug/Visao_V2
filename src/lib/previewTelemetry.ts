/**
 * VISÃO — Telemetria da prévia ao vivo.
 *
 * Fire-and-forget: nunca deve bloquear o player em caso de falha do backend.
 * Toda inserção respeita RLS (auth.uid() = user_id via DEFAULT).
 */
import { supabase } from '@/integrations/supabase/client';
import { detectBrowser, resolutionBucket } from '@/lib/browserInfo';
import type { LivePreviewErrorCode } from '@/lib/livePreviewErrors';

export type PreviewEventType = 'started' | 'extended' | 'stopped' | 'failed';

export interface PreviewEventInput {
  eventType: PreviewEventType;
  sessionId?: string | null;
  cameraId?: string | null;
  reason?: string | null;
  errorCode?: LivePreviewErrorCode | string | null;
  codec?: string | null;
  width?: number | null;
  height?: number | null;
  latencyMs?: number | null;
  durationMs?: number | null;
  extensions?: number | null;
  metadata?: Record<string, unknown>;
}

let cachedUserId: string | null | undefined;

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
}

/**
 * Envia um evento de telemetria. Nunca lança — falhas são registradas
 * apenas em `console.debug` durante desenvolvimento.
 */
export async function logPreviewEvent(input: PreviewEventInput): Promise<void> {
  try {
    const userId = await getUserId();
    if (!userId) return; // não autenticado → não instrumenta

    const info = detectBrowser();
    const payload = {
      user_id: userId,
      session_id: input.sessionId ?? null,
      camera_id: input.cameraId ?? null,
      event_type: input.eventType,
      reason: input.reason ?? null,
      error_code: input.errorCode ?? null,
      codec: input.codec ?? null,
      width: Number.isFinite(input.width) ? Number(input.width) : null,
      height: Number.isFinite(input.height) ? Number(input.height) : null,
      resolution: resolutionBucket(input.width ?? null, input.height ?? null),
      browser: info.browser,
      browser_version: info.browserVersion,
      os: info.os,
      network_type: info.networkType ?? null,
      duration_ms: Number.isFinite(input.durationMs) ? Number(input.durationMs) : null,
      latency_ms: Number.isFinite(input.latencyMs) ? Number(input.latencyMs) : null,
      extensions: Number.isFinite(input.extensions) ? Number(input.extensions) : null,
      metadata: (input.metadata ?? {}) as unknown as import('@/integrations/supabase/types').Json,
    };

    const { error } = await supabase.from('preview_telemetry_events').insert(payload);
    if (error && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[preview-telemetry] insert failed:', error.message);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[preview-telemetry] unexpected:', err);
    }
  }
}

/** Reseta o cache do `user_id` — útil em testes ou após logout. */
export function __resetPreviewTelemetryCache(): void {
  cachedUserId = undefined;
}
