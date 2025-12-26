/**
 * useMediaRecorder Hook
 * Media recording functionality
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseMediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
}

export function useMediaRecorder(stream: MediaStream | null, options: UseMediaRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(() => {
    if (!stream) { setError(new Error('No stream')); return; }
    try {
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setRecordedBlob(blob);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
    } catch (e) { setError(e as Error); }
  }, [stream, options]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === 'recording') { recorderRef.current.pause(); setIsPaused(true); }
  }, []);

  const resume = useCallback(() => {
    if (recorderRef.current?.state === 'paused') { recorderRef.current.resume(); setIsPaused(false); }
  }, []);

  useEffect(() => () => { recorderRef.current?.stop(); }, []);

  return { isRecording, isPaused, recordedBlob, error, start, stop, pause, resume };
}
export default useMediaRecorder;
