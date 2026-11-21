import { logger } from '@/lib/logger';
/**
 * VISÃO - ClipRecorderControls (Refactored)
 * Subcomponents: CompactClipControls, FullClipControls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useClipStorage } from '@/hooks/clip-recorder/useClipStorage';
import { CompactClipControls } from './clip-recorder/CompactClipControls';
import { FullClipControls } from './clip-recorder/FullClipControls';

interface ClipRecorderControlsProps {
  cameraId: string;
  cameraName: string;
  streamRef?: React.RefObject<HTMLVideoElement | null>;
  maxDuration?: number;
  onClipSaved?: (clip: SavedClip) => void;
  className?: string;
  compact?: boolean;
}

export interface SavedClip {
  id: string;
  cameraId: string;
  cameraName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  blob: Blob;
  url: string;
  thumbnail: string | undefined;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'saved';

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const mime = dataUrl.slice(5, comma).split(';')[0] ?? 'image/jpeg';
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function ClipRecorderControls({
  cameraId,
  cameraName,
  streamRef,
  maxDuration = 300,
  onClipSaved,
  className,
  compact = false,
}: ClipRecorderControlsProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [savedClip, setSavedClip] = useState<SavedClip | null>(null);
  const [clipDurationSetting, setClipDurationSetting] = useState(60);

  const { saveClip, deleteClip } = useClipStorage(cameraId, cameraName);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
        mediaRecorderRef.current.stop();
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
      mediaRecorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      let stream: MediaStream | null = null;
      if (streamRef?.current?.srcObject instanceof MediaStream)
        stream = streamRef.current.srcObject;
      else if (streamRef?.current && 'captureStream' in streamRef.current)
        stream = (
          streamRef.current as unknown as { captureStream: () => MediaStream }
        ).captureStream();
      else if (streamRef?.current && 'mozCaptureStream' in streamRef.current)
        stream = (
          streamRef.current as unknown as { mozCaptureStream: () => MediaStream }
        ).mozCaptureStream();
      if (!stream) {
        toast.error('Stream não disponível para gravação');
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        setState('processing');
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const endTime = new Date();
          const clipDuration = Math.round(
            (endTime.getTime() - (startTimeRef.current?.getTime() || 0)) / 1000
          );
          let thumbnail: string | undefined;
          if (streamRef?.current) {
            const canvas = document.createElement('canvas');
            canvas.width = streamRef.current.videoWidth || 320;
            canvas.height = streamRef.current.videoHeight || 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(streamRef.current, 0, 0, canvas.width, canvas.height);
              thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            }
          }
          const clip: SavedClip = {
            id: `clip-${Date.now()}`,
            cameraId,
            cameraName,
            startTime: startTimeRef.current || new Date(),
            endTime,
            duration: clipDuration,
            blob,
            url,
            thumbnail,
          };
          setSavedClip(clip);
          setState('saved');
          onClipSaved?.(clip);
          toast.success(
            `Clip salvo: ${Math.floor(clipDuration / 60)
              .toString()
              .padStart(2, '0')}:${(clipDuration % 60).toString().padStart(2, '0')}`
          );

          const dbId = await saveClip({
            blob,
            url,
            thumbnailUrl: clip.thumbnail,
            thumbnailBlob: clip.thumbnail ? dataUrlToBlob(clip.thumbnail) : undefined,
            startTime: startTimeRef.current || new Date(),
            endTime,
            duration: clipDuration,
            fileSize: blob.size,
            mimeType: blob.type || 'video/webm',
            metadata: { cameraId, cameraName, triggerType: 'manual' },
          });
          if (dbId) setSavedClip({ ...clip, id: dbId });
        } catch (error) {
          logger.error('Erro ao processar clip', error);
          setState('idle');
          toast.error('Erro ao processar gravação');
        }
      };
      mediaRecorder.onerror = (event) => {
        logger.error('Erro no MediaRecorder', event);
        setState('idle');
        toast.error('Erro na gravação');
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = new Date();
      setDuration(0);
      mediaRecorder.start(1000);
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const n = d + 1;
          if (n >= maxDuration) stopRecording();
          return n;
        });
      }, 1000);

      toast.success('Gravação iniciada');
    } catch (error) {
      logger.error('Erro ao iniciar gravação', error);
      toast.error('Não foi possível iniciar a gravação');
    }
  }, [cameraId, cameraName, streamRef, maxDuration, onClipSaved, stopRecording]);

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  }, [state]);

  const downloadClip = useCallback(() => {
    if (!savedClip) return;
    const a = document.createElement('a');
    a.href = savedClip.url;
    a.download = `${cameraName.replace(/\s+/g, '_')}_${savedClip.startTime.toISOString().slice(0, 19).replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download iniciado');
  }, [savedClip, cameraName]);

  const discardClip = useCallback(() => {
    if (savedClip?.url) URL.revokeObjectURL(savedClip.url);
    if (savedClip?.id && !savedClip.id.startsWith('clip-')) {
      void deleteClip(savedClip.id);
    }
    setSavedClip(null);
    setState('idle');
    setDuration(0);
  }, [savedClip, deleteClip]);

  const progress = (duration / maxDuration) * 100;

  if (compact) {
    return (
      <CompactClipControls
        state={state}
        duration={duration}
        savedClip={savedClip}
        onStart={startRecording}
        onStop={stopRecording}
        onDownload={downloadClip}
        onDiscard={discardClip}
        className={className}
      />
    );
  }

  return (
    <FullClipControls
      state={state}
      duration={duration}
      maxDuration={maxDuration}
      progress={progress}
      savedClip={savedClip}
      clipDurationSetting={clipDurationSetting}
      setClipDurationSetting={setClipDurationSetting}
      onStart={startRecording}
      onStop={stopRecording}
      onPause={togglePause}
      onDownload={downloadClip}
      onDiscard={discardClip}
      className={className}
    />
  );
}

export default ClipRecorderControls;
