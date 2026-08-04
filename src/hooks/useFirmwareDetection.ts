/**
 * useFirmwareDetection — Hook TanStack para autodetecção de marca/modelo.
 *
 * Estratégia dual:
 *   - Arquivos ≤ 2 MB são analisados no cliente (detector puro, zero rede).
 *   - Arquivos maiores ou análise via URL são delegados à Edge Function
 *     `firmware-fingerprint` (com auditoria + telemetria server-side).
 *
 * Também expõe utilitário para analisar diretamente uma sonda ONVIF.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  detectFromBuffer,
  detectFromOnvifProbe,
  mergeMatches,
  type FirmwareMatch,
  type OnvifProbe,
} from '@/lib/firmwareDetector';

const CLIENT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export interface FirmwareDetectionResult {
  matches: FirmwareMatch[];
  topMatch: FirmwareMatch | null;
  ranBy: 'client' | 'server';
}

async function readAsUint8Array(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function detectFileClient(file: File, onvif?: OnvifProbe): Promise<FirmwareDetectionResult> {
  const bytes = await readAsUint8Array(file);
  const fromBuffer = detectFromBuffer(bytes);
  const fromOnvif = onvif ? detectFromOnvifProbe(onvif) : [];
  const merged = mergeMatches(fromBuffer, fromOnvif);
  return {
    matches: merged,
    topMatch: merged[0] ?? null,
    ranBy: 'client',
  };
}

async function detectFileServer(file: File, onvif?: OnvifProbe): Promise<FirmwareDetectionResult> {
  const form = new FormData();
  form.append('file', file, file.name);
  if (onvif) form.append('onvif', JSON.stringify(onvif));

  const { data, error } = await supabase.functions.invoke<FirmwareDetectionResult>(
    'firmware-fingerprint',
    { body: form }
  );
  if (error) throw new Error(error.message ?? 'Falha na análise de firmware.');
  if (!data) throw new Error('Resposta vazia da análise de firmware.');
  return { ...data, ranBy: 'server' };
}

export function useFirmwareDetection() {
  const detectFile = useMutation<
    FirmwareDetectionResult,
    Error,
    { file: File; onvif?: OnvifProbe }
  >({
    mutationFn: async ({ file, onvif }) => {
      if (file.size <= CLIENT_MAX_BYTES) return detectFileClient(file, onvif);
      return detectFileServer(file, onvif);
    },
  });

  const detectUrl = useMutation<
    FirmwareDetectionResult,
    Error,
    { url: string; onvif?: OnvifProbe }
  >({
    mutationFn: async ({ url, onvif }) => {
      const { data, error } = await supabase.functions.invoke<FirmwareDetectionResult>(
        'firmware-fingerprint',
        { body: { url, onvif } }
      );
      if (error) throw new Error(error.message ?? 'Falha na análise de firmware.');
      if (!data) throw new Error('Resposta vazia da análise de firmware.');
      return { ...data, ranBy: 'server' };
    },
  });

  const detectOnvif = (probe: OnvifProbe): FirmwareDetectionResult => {
    const matches = detectFromOnvifProbe(probe);
    return { matches, topMatch: matches[0] ?? null, ranBy: 'client' };
  };

  return { detectFile, detectUrl, detectOnvif };
}
