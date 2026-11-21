/**
 * VISÃO - Stream Statistics
 */
import { useCallback, useRef, useEffect } from 'react';
import type Hls from 'hls.js';
import { StreamStats, StreamQuality } from '@/types/streaming';

interface UseStreamStatsOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  hlsRef: React.MutableRefObject<Hls | null>;
  connectionStartRef: React.MutableRefObject<number>;
  reconnectAttempts: number;
  isPlaying: boolean;
  updateState: (updates: Record<string, unknown>) => void;
  onStatsUpdate?: (stats: StreamStats) => void;
}

function normalizeQuality(height: number): StreamQuality | null {
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return null;
}

export function useStreamStats(options: UseStreamStatsOptions) {
  const {
    videoRef,
    hlsRef,
    connectionStartRef,
    reconnectAttempts,
    isPlaying,
    updateState,
    onStatsUpdate,
  } = options;
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Bitrate adaptativo: ciclos consecutivos de buffer baixo degradam (autoLevelCapping);
  // buffer estável recupera. Ignora fase inicial e qualidade manual.
  const lowBufferCountRef = useRef(0);
  const stableBufferCountRef = useRef(0);

  // Nova instancia de HLS (troca de camera/reconexao) reinicia a sequencia
  // no fluxo de amostragem (o ref compartilhado nao muda de identidade para efeitos).
  const lastHlsRef = useRef<Hls | null>(null);

  const updateStats = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const stats: StreamStats = {
      bitrate: 0,
      fps: 0,
      resolution: { width: video.videoWidth, height: video.videoHeight },
      latency: 0,
      droppedFrames: 0,
      buffered: 0,
      connectionTime: connectionStartRef.current ? Date.now() - connectionStartRef.current : 0,
      reconnectAttempts,
    };

    if (video.buffered.length > 0) {
      // buffer contiguo que contem o playhead; nao o fim do ultimo intervalo
      let contiguous = 0;
      for (let i = video.buffered.length - 1; i >= 0; i--) {
        const start = video.buffered.start(i);
        const end = video.buffered.end(i);
        if (video.currentTime >= start && video.currentTime <= end) {
          contiguous = end - video.currentTime;
          break;
        }
      }
      stats.buffered = contiguous;
    }

    if (hlsRef.current) {
      const hls = hlsRef.current;
      if (hls.bandwidthEstimate) stats.bitrate = Math.round(hls.bandwidthEstimate / 1000);
      if (hls.latency !== undefined) stats.latency = Math.round(hls.latency * 1000);
    }

    if ('getVideoPlaybackQuality' in video) {
      const quality = (
        video as HTMLVideoElement & {
          getVideoPlaybackQuality(): { droppedVideoFrames?: number; totalVideoFrames?: number };
        }
      ).getVideoPlaybackQuality();
      stats.droppedFrames = quality?.droppedVideoFrames || 0;
      if (quality?.totalVideoFrames && connectionStartRef.current) {
        const elapsed = (Date.now() - connectionStartRef.current) / 1000;
        stats.fps = Math.round(quality.totalVideoFrames / elapsed);
      }
    }

    updateState({ stats });
    onStatsUpdate?.(stats);

    // Bitrate adaptativo: degrada via autoLevelCapping (mantem o ABR do hls.js,
    // sem fixar nivel manual nem descartar buffer). So atua em modo automatico;
    // escolha manual limpa a sequencia consecutiva.
    if (
      hlsRef.current &&
      video.currentTime > 5 &&
      video.videoWidth > 0 &&
      hlsRef.current.levels.length > 0
    ) {
      const hls = hlsRef.current;
      const isManual = !hls.autoLevelEnabled;
      if (hls !== lastHlsRef.current) {
        // troca de instancia HLS (camera/reconexao): sequencia nova
        lastHlsRef.current = hls;
        lowBufferCountRef.current = 0;
        stableBufferCountRef.current = 0;
      }
      if (isManual) {
        // escolha manual do usuario nao compete com a adaptacao
        lowBufferCountRef.current = 0;
        stableBufferCountRef.current = 0;
      } else if (stats.buffered < 1.2) {
        stableBufferCountRef.current = 0;
        lowBufferCountRef.current += 1;
        if (lowBufferCountRef.current >= 2) {
          const capIndex =
            hls.autoLevelCapping >= 0
              ? hls.autoLevelCapping - 1
              : Math.max(0, (hls.currentLevel > 0 ? hls.currentLevel : hls.levels.length - 1) - 1);
          if (capIndex >= 0 && capIndex < hls.levels.length) {
            hls.autoLevelCapping = capIndex;
            const capTarget = hls.levels[capIndex];
            if (capTarget) {
              const q = normalizeQuality(capTarget.height);
              if (q) updateState({ currentQuality: q });
            }
          }
        }
      } else if (stats.buffered >= 3) {
        lowBufferCountRef.current = 0;
        stableBufferCountRef.current += 1;
        if (stableBufferCountRef.current >= 2 && hls.autoLevelCapping >= 0) {
          hls.autoLevelCapping = -1;
          updateState({ currentQuality: 'auto' });
        }
      } else {
        // amostra intermediaria quebra a sequencia consecutiva
        lowBufferCountRef.current = 0;
        stableBufferCountRef.current = 0;
      }
    }
  }, [
    videoRef,
    hlsRef,
    connectionStartRef,
    reconnectAttempts,
    updateState,
    onStatsUpdate,
    lowBufferCountRef,
    stableBufferCountRef,
  ]);

  useEffect(() => {
    if (isPlaying) {
      statsIntervalRef.current = setInterval(updateStats, 2000);
    } else if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [isPlaying, updateStats]);

  return { updateStats, statsIntervalRef };
}
