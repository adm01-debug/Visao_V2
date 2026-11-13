import { supabase } from '@/integrations/supabase/client';
import type { PrivateHostResolution } from '@/components/cameras/PrivateHostBlockedWizard';
import { logger } from './logger';

export type ConnectivityChosenPath = 'relay' | 'vpn' | 'port_forward' | 'cancelled';

export interface RecordConnectivityResolutionInput {
  errorCode: string;
  cameraId?: string | null;
  chosenPath: ConnectivityChosenPath;
  relayAgentId?: string | null;
  publicHost?: string | null;
  publicPort?: number | null;
  originalHost?: string | null;
  originalPort?: number | null;
  succeeded?: boolean | null;
  retryErrorCode?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}

/** Converte a resolução do wizard em payload de telemetria. */
export function resolutionToTelemetry(
  resolution: PrivateHostResolution,
  originalHost: string | null,
  originalPort: number | null
): Pick<
  RecordConnectivityResolutionInput,
  'chosenPath' | 'relayAgentId' | 'publicHost' | 'publicPort' | 'originalHost' | 'originalPort'
> {
  if (resolution.mode === 'relay') {
    return {
      chosenPath: 'relay',
      relayAgentId: resolution.relayAgentId,
      originalHost,
      originalPort,
    };
  }
  if (resolution.mode === 'vpn') {
    return { chosenPath: 'vpn', originalHost, originalPort };
  }
  return {
    chosenPath: 'port_forward',
    publicHost: resolution.publicHost,
    publicPort: resolution.publicPort,
    originalHost,
    originalPort,
  };
}

/** Grava um evento de telemetria (best-effort — nunca lança). */
export async function recordConnectivityResolution(
  input: RecordConnectivityResolutionInput
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    await supabase.from('connectivity_resolution_telemetry').insert({
      user_id: userId,
      camera_id: input.cameraId ?? null,
      error_code: input.errorCode,
      chosen_path: input.chosenPath,
      relay_agent_id: input.relayAgentId ?? null,
      public_host: input.publicHost ?? null,
      public_port: input.publicPort ?? null,
      original_host: input.originalHost ?? null,
      original_port: input.originalPort ?? null,
      succeeded: input.succeeded ?? null,
      retry_error_code: input.retryErrorCode ?? null,
      duration_ms: input.durationMs ?? null,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.warn('[connectivityTelemetry] insert failed', err);
    }
  }
}

export type CameraConnectivityPath = 'relay' | 'vpn' | 'port_forward' | 'direct';

export interface SaveCameraConnectivityPreferenceInput {
  cameraId: string;
  preferredPath: CameraConnectivityPath;
  relayAgentId?: string | null;
  publicHost?: string | null;
  publicPort?: number | null;
  metadata?: Record<string, unknown>;
}

/** Persiste a preferência de conectividade da câmera (best-effort). */
export async function saveCameraConnectivityPreference(
  input: SaveCameraConnectivityPreferenceInput
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    await supabase.from('camera_connectivity_preferences').upsert(
      {
        camera_id: input.cameraId,
        user_id: userId,
        preferred_path: input.preferredPath,
        relay_agent_id: input.relayAgentId ?? null,
        public_host: input.publicHost ?? null,
        public_port: input.publicPort ?? null,
        last_success_at: new Date().toISOString(),
        metadata: (input.metadata ?? {}) as never,
      },
      { onConflict: 'camera_id' }
    );
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.warn('[connectivityTelemetry] preference save failed', err);
    }
  }
}
