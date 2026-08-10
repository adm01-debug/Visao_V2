/**
 * Onda Shinobi 1 — useAnalysisStream
 *
 * Retorna a URL/protocolo que a IA deve consumir para análise contínua.
 * Regra:
 *   1. Se `substream_enabled` E `substream_url` existirem → usa substream.
 *   2. Caso contrário, faz fallback para o mainstream (`stream_url`).
 *   3. Se nenhum estiver disponível, retorna `null` (a IA fica ociosa).
 *
 * Benefício: cargas de ML/Gemini processam vídeo em 480p/512kbps em vez de
 * 1080p/4Mbps, reduzindo custo e latência sem afetar o playback.
 */
import { useMemo } from 'react';

export type StreamProtocol = 'hls' | 'webrtc' | 'rtsp';

export interface AnalysisStreamCamera {
  stream_url?: string | null;
  stream_type?: string | null;
  substream_url?: string | null;
  substream_protocol?: string | null;
  substream_enabled?: boolean | null;
}

export interface AnalysisStreamResult {
  url: string | null;
  protocol: StreamProtocol;
  source: 'substream' | 'mainstream' | 'none';
  usingSubstream: boolean;
}

function normalizeProtocol(p: string | null | undefined): StreamProtocol {
  if (p === 'webrtc' || p === 'rtsp' || p === 'hls') return p;
  return 'hls';
}

export function resolveAnalysisStream(camera: AnalysisStreamCamera): AnalysisStreamResult {
  const subOk =
    Boolean(camera.substream_enabled) &&
    typeof camera.substream_url === 'string' &&
    camera.substream_url.length > 0;

  if (subOk) {
    return {
      url: camera.substream_url as string,
      protocol: normalizeProtocol(camera.substream_protocol),
      source: 'substream',
      usingSubstream: true,
    };
  }

  if (camera.stream_url) {
    return {
      url: camera.stream_url,
      protocol: normalizeProtocol(camera.stream_type),
      source: 'mainstream',
      usingSubstream: false,
    };
  }

  return { url: null, protocol: 'hls', source: 'none', usingSubstream: false };
}

export function useAnalysisStream(
  camera: AnalysisStreamCamera | null | undefined
): AnalysisStreamResult {
  return useMemo(() => {
    if (!camera) return { url: null, protocol: 'hls', source: 'none', usingSubstream: false };
    return resolveAnalysisStream(camera);
  }, [
    camera?.stream_url,
    camera?.stream_type,
    camera?.substream_url,
    camera?.substream_protocol,
    camera?.substream_enabled,
  ]);
}
