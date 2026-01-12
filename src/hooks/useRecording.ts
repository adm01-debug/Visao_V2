import { useState, useCallback, useRef } from 'react';

interface Recording {
  id: string;
  cameraId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  size?: number;
  status: 'recording' | 'completed' | 'failed';
}

export function useRecording(cameraId: string) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    const newRecording: Recording = {
      id: Date.now().toString(),
      cameraId,
      startTime: new Date(),
      status: 'recording'
    };
    setRecording(newRecording);
    intervalRef.current = setInterval(() => {
      setRecording(r => r ? { ...r, duration: (Date.now() - r.startTime.getTime()) / 1000 } : null);
    }, 1000);
    return newRecording;
  }, [cameraId]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (recording) {
      const completed: Recording = { ...recording, endTime: new Date(), status: 'completed' };
      completed.duration = (completed.endTime!.getTime() - recording.startTime.getTime()) / 1000;
      setRecordings(prev => [...prev, completed]);
      setRecording(null);
      return completed;
    }
    return null;
  }, [recording]);

  const isRecording = recording?.status === 'recording';

  return { recording, recordings, isRecording, start, stop };
}

export default useRecording;
