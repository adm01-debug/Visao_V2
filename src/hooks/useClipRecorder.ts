/**
 * VISÃO - useClipRecorder (Refactored)
 * Composes from clip-recorder/types and clip-recorder/useClipStorage
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  RecordingState, TriggerType, RecordingConfig, RecordedClip,
  DEFAULT_RECORDING_CONFIG, SUPPORTED_MIME_TYPES,
} from './clip-recorder/types';
import { useClipStorage } from './clip-recorder/useClipStorage';

// Re-export types
export type { RecordingState, TriggerType, RecordingConfig, RecordedClip };
export type { ClipMetadata } from './clip-recorder/types';

interface UseClipRecorderOptions {
  cameraId: string;
  cameraName: string;
  maxDuration?: number;
  autoSave?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (clip: RecordedClip) => void;
  onRecordingSave?: (clipId: string) => void;
  onError?: (error: Error) => void;
}

export function useClipRecorder(options: UseClipRecorderOptions) {
  const { cameraId, cameraName, maxDuration = 60, autoSave = false, onRecordingStart, onRecordingStop, onRecordingSave, onError } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [currentClip, setCurrentClip] = useState<RecordedClip | null>(null);
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [config, setConfig] = useState<RecordingConfig>({ ...DEFAULT_RECORDING_CONFIG, maxDurationSeconds: maxDuration, autoSave });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const triggerTypeRef = useRef<TriggerType>('manual');

  const canRecord = typeof MediaRecorder !== 'undefined';
  const supportedMimeTypes = SUPPORTED_MIME_TYPES.filter(type => MediaRecorder.isTypeSupported(type));

  const { saveClip: storageSave, deleteClip: storageDelete, downloadClip } = useClipStorage(cameraId, cameraName);

  const clearTimer = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }, []);

  const generateThumbnail = useCallback(async (videoElement: HTMLVideoElement): Promise<Blob | null> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 320;
      canvas.height = videoElement.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8));
    } catch { return null; }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordedClip | null> => {
    if (!mediaRecorderRef.current || state === 'idle') return null;

    return new Promise((resolve) => {
      setState('processing');
      clearTimer();
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        try {
          const endTime = new Date();
          const startTime = startTimeRef.current || new Date();
          const mimeType = recorder.mimeType || 'video/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

          const clip: RecordedClip = {
            blob, url, startTime, endTime, duration: durationSeconds, fileSize: blob.size, mimeType,
            metadata: { cameraId, cameraName, triggerType: triggerTypeRef.current },
          };

          setCurrentClip(clip);
          setClips(prev => [...prev, clip]);
          onRecordingStop?.(clip);

          if (config.autoSave) {
            const id = await storageSave(clip);
            if (id) { clip.id = id; onRecordingSave?.(id); }
          }

          setState('idle'); setDuration(0);
          mediaRecorderRef.current = null; chunksRef.current = []; startTimeRef.current = null;
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
          resolve(clip);
        } catch (error) {
          onError?.(error as Error); setState('idle'); resolve(null);
        }
      };
      recorder.stop();
    });
  }, [state, config, cameraId, cameraName, clearTimer, onRecordingStop, onRecordingSave, onError, storageSave]);

  const startRecording = useCallback(async (videoElement: HTMLVideoElement, triggerType: TriggerType = 'manual'): Promise<boolean> => {
    if (!canRecord) { onError?.(new Error('MediaRecorder não suportado')); return false; }
    if (state !== 'idle') return false;

    try {
      let stream: MediaStream;
      if ('captureStream' in videoElement) stream = (videoElement as unknown as { captureStream: () => MediaStream }).captureStream();
      else if ('mozCaptureStream' in videoElement) stream = (videoElement as unknown as { mozCaptureStream: () => MediaStream }).mozCaptureStream();
      else throw new Error('Navegador não suporta captureStream');

      streamRef.current = stream;
      triggerTypeRef.current = triggerType;

      const mimeType = supportedMimeTypes[0] || 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: config.videoBitsPerSecond });
      chunksRef.current = [];
      startTimeRef.current = new Date();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onerror = () => { onError?.(new Error('Erro na gravação')); setState('idle'); clearTimer(); };
      recorder.onstop = async () => {};

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setState('recording'); setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => { const n = prev + 1; if (n >= config.maxDurationSeconds) stopRecording(); return n; });
      }, 1000);

      onRecordingStart?.();
      return true;
    } catch (error) { onError?.(error as Error); return false; }
  }, [canRecord, state, config, supportedMimeTypes, onRecordingStart, onError, clearTimer, stopRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') { mediaRecorderRef.current.pause(); setState('paused'); clearTimer(); }
  }, [state, clearTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume(); setState('recording');
      timerRef.current = setInterval(() => {
        setDuration(prev => { if (prev >= config.maxDurationSeconds) stopRecording(); return prev + 1; });
      }, 1000);
    }
  }, [state, config.maxDurationSeconds, stopRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    clearTimer(); setState('idle'); setDuration(0);
    chunksRef.current = []; startTimeRef.current = null;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    mediaRecorderRef.current = null;
  }, [clearTimer]);

  const saveClip = useCallback(async (clip: RecordedClip): Promise<string | null> => {
    setState('saving');
    const id = await storageSave(clip);
    if (id) { clip.id = id; setClips(prev => prev.map(c => c.url === clip.url ? { ...c, id } : c)); onRecordingSave?.(id); }
    setState('idle');
    return id;
  }, [storageSave, onRecordingSave]);

  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    const ok = await storageDelete(clipId);
    if (ok) setClips(prev => prev.filter(c => c.id !== clipId));
    return ok;
  }, [storageDelete]);

  const clearClips = useCallback(() => {
    clips.forEach(c => { if (c.url.startsWith('blob:')) URL.revokeObjectURL(c.url); if (c.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(c.thumbnailUrl); });
    setClips([]); setCurrentClip(null);
  }, [clips]);

  const updateConfig = useCallback((updates: Partial<RecordingConfig>) => { setConfig(prev => ({ ...prev, ...updates })); }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      clips.forEach(c => { if (c.url.startsWith('blob:')) URL.revokeObjectURL(c.url); });
    };
  }, [clearTimer, clips]);

  const progress = config.maxDurationSeconds > 0 ? Math.min((duration / config.maxDurationSeconds) * 100, 100) : 0;

  return {
    state, isRecording: state === 'recording', isPaused: state === 'paused',
    duration, progress, currentClip, clips,
    config, updateConfig,
    startRecording, stopRecording, pauseRecording, resumeRecording,
    cancelRecording, saveClip, downloadClip, deleteClip, clearClips,
    canRecord, supportedMimeTypes, generateThumbnail,
  };
}

export default useClipRecorder;
