import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildRtspUrl, hasEmbeddedCredentials } from '@/components/cameras/addCameraSchema';

export type ValidationSeverity = 'info' | 'warn' | 'critical';
export interface ValidationSuggestion {
  code: string;
  severity: ValidationSeverity;
  message: string;
}
export interface ValidationResult {
  ok: boolean;
  target: 'primary' | 'substream' | 'inline';
  samples: number;
  samples_detail: Array<{ ok: boolean; ms: number; status: number }>;
  latency: { min: number; avg: number; max: number; p95: number; jitter: number };
  loss_pct: number;
  codec: string | null;
  resolution: string | null;
  fps: number | null;
  auth_method: 'none' | 'basic' | 'digest' | null;
  score: 'ok' | 'warn' | 'critical';
  suggestions: ValidationSuggestion[];
  warnings: string[];
}

export type ValidateArgs =
  | { mode: 'inline'; rtspUrl: string; username?: string; password?: string; samples?: number }
  | { mode: 'camera'; cameraId: string; target: 'primary' | 'substream'; samples?: number };

export function useRtspValidation() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (args: ValidateArgs) => {
    setLoading(true);
    setError(null);
    try {
      let body: Record<string, unknown>;
      if (args.mode === 'inline') {
        const embedded = hasEmbeddedCredentials(args.rtspUrl);
        const finalUrl = embedded
          ? args.rtspUrl
          : buildRtspUrl(args.rtspUrl, args.username || undefined, args.password || undefined);
        body = { rtsp_url: finalUrl, samples: args.samples ?? 5 };
      } else {
        body = { camera_id: args.cameraId, target: args.target, samples: args.samples ?? 5 };
      }
      const { data, error: fnErr } = await supabase.functions.invoke('validate-rtsp-stream', {
        body,
      });
      if (fnErr) throw new Error(fnErr.message);
      if (!data) throw new Error('Resposta vazia da validação');
      setResult(data as ValidationResult);
      return data as ValidationResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { validate, reset, result, loading, error };
}
