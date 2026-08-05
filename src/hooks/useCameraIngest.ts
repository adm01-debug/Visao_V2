import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { IngestProtocol } from '@/lib/ingest/streamIngest';
import type { Tables } from '@/integrations/supabase/types';

export type IngestEndpointRow = Tables<'camera_ingest_endpoints'>;

interface UseCameraIngestResult {
  endpoint: IngestEndpointRow | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  enablePush: (protocol: Exclude<IngestProtocol, 'rtsp_pull'>) => Promise<void>;
  rotateKey: () => Promise<void>;
  revoke: () => Promise<void>;
}

/** Gera a chave no cliente com CSPRNG; o banco só aceita 32–64 chars hex. */
function generateStreamKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Onda 124 — gerencia o endpoint de ingestão (RTMP/SRT push) de uma câmera.
 * Toda escrita é isolada por RLS (`auth.uid() = user_id`).
 */
export function useCameraIngest(cameraId: string | null): UseCameraIngestResult {
  const { user } = useAuth();
  const [endpoint, setEndpoint] = useState<IngestEndpointRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cameraId) {
      setEndpoint(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('camera_ingest_endpoints')
      .select('*')
      .eq('camera_id', cameraId)
      .in('protocol', ['rtmp_push', 'srt_push'])
      .maybeSingle();
    if (err) setError(err.message);
    setEndpoint(data ?? null);
    setLoading(false);
  }, [cameraId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const enablePush = useCallback(
    async (protocol: Exclude<IngestProtocol, 'rtsp_pull'>) => {
      if (!cameraId || !user?.id) return;
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('camera_ingest_endpoints')
        .upsert(
          {
            camera_id: cameraId,
            user_id: user.id,
            protocol,
            stream_key: generateStreamKey(),
            status: 'pending',
          },
          { onConflict: 'camera_id,protocol' }
        )
        .select()
        .single();
      if (err) setError(err.message);
      else setEndpoint(data);
      setLoading(false);
    },
    [cameraId, user?.id]
  );

  const rotateKey = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('camera_ingest_endpoints')
      .update({ stream_key: generateStreamKey() })
      .eq('id', endpoint.id)
      .select()
      .single();
    if (err) setError(err.message);
    else setEndpoint(data);
    setLoading(false);
  }, [endpoint]);

  const revoke = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('camera_ingest_endpoints')
      .update({ status: 'revoked' })
      .eq('id', endpoint.id)
      .select()
      .single();
    if (err) setError(err.message);
    else setEndpoint(data);
    setLoading(false);
  }, [endpoint]);

  return { endpoint, loading, error, reload, enablePush, rotateKey, revoke };
}
