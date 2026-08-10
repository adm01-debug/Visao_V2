/**
 * VISÃO - Stream Statistics
 */
import { useCallback, useRef, useEffect } from 'react';
import type Hls from 'hls.js';
import { StreamStats } from '@/types/streaming';

interface UseStreamStatsOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  hlsRef: React.MutableRefObject<Hls | null>;
  connectionStartRef: React.MutableRefObject<number>;
  reconnectAttempts: number;
  isPlaying: boolean;
  updateState: (updates: Record<string, unknown>) => void;
  onStatsUpdate?: (stats: StreamStats) => void;
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
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      stats.buffered = bufferedEnd - video.currentTime;
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
  }, [videoRef, hlsRef, connectionStartRef, reconnectAttempts, updateState, onStatsUpdate]);

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
