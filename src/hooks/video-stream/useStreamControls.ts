/**
 * VISÃO - Stream Playback Controls
 */
import { useCallback, useRef } from 'react';
import type Hls from 'hls.js';
import { StreamQuality } from '@/types/streaming';

interface UseStreamControlsOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  hlsRef: React.MutableRefObject<Hls | null>;
  updateState: (updates: Record<string, unknown>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSnapshot?: (dataUrl: string) => void;
  onFrame?: (imageData: ImageData) => void;
  onQualityChange?: (quality: StreamQuality) => void;
}

export function useStreamControls(options: UseStreamControlsOptions) {
  const { videoRef, hlsRef, updateState, onPlay, onPause, onSnapshot, onFrame, onQualityChange } = options;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      updateState({ status: 'playing', isPlaying: true });
      onPlay?.();
    } catch {
      updateState({ isPlaying: false });
    }
  }, [videoRef, updateState, onPlay]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    updateState({ status: 'paused', isPlaying: false });
    onPause?.();
  }, [videoRef, updateState, onPause]);

  const togglePlay = useCallback(async (isPlaying: boolean) => {
    if (isPlaying) pause(); else await play();
  }, [play, pause]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    updateState({ isMuted: video.muted });
  }, [videoRef, updateState]);

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, volume));
    updateState({ volume: video.volume, isMuted: video.volume === 0 });
  }, [videoRef, updateState]);

  const setQuality = useCallback((quality: StreamQuality) => {
    if (!hlsRef.current) return;
    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1;
    } else {
      const targetHeight = parseInt(quality);
      const levelIndex = hlsRef.current.levels.findIndex(level => level.height === targetHeight);
      if (levelIndex >= 0) hlsRef.current.currentLevel = levelIndex;
    }
    updateState({ currentQuality: quality });
    onQualityChange?.(quality);
  }, [hlsRef, updateState, onQualityChange]);

  const getCanvas = useCallback(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    return canvasRef.current;
  }, []);

  const takeSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = getCanvas();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSnapshot?.(dataUrl);
    return dataUrl;
  }, [videoRef, onSnapshot, getCanvas]);

  const getCurrentFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = getCanvas();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onFrame?.(imageData);
    return imageData;
  }, [videoRef, onFrame, getCanvas]);

  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        updateState({ isFullscreen: false });
      } else {
        await video.requestFullscreen();
        updateState({ isFullscreen: true });
      }
    } catch {}
  }, [videoRef, updateState]);

  return { play, pause, togglePlay, toggleMute, setVolume, setQuality, takeSnapshot, getCurrentFrame, toggleFullscreen };
}
