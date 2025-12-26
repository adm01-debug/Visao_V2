/**
 * Media Recorder Component
 * Audio/Video recording with preview
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { Mic, Video, Square, Pause, Play, Download, Trash2, Settings } from 'lucide-react';

export type RecordingType = 'audio' | 'video' | 'screen';

export interface MediaRecorderProps {
  type?: RecordingType;
  maxDuration?: number;
  mimeType?: string;
  onRecordingComplete?: (blob: Blob, url: string) => void;
  onError?: (error: Error) => void;
  showPreview?: boolean;
  showTimer?: boolean;
  showSettings?: boolean;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const MediaRecorderComponent: React.FC<MediaRecorderProps> = ({
  type = 'audio',
  maxDuration,
  mimeType,
  onRecordingComplete,
  onError,
  showPreview = true,
  showTimer = true,
  showSettings = false,
  className,
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [selectedDevices, setSelectedDevices] = useState({ audio: '', video: '' });
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Get available devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(deviceList => {
      const audio = deviceList.filter(d => d.kind === 'audioinput');
      const video = deviceList.filter(d => d.kind === 'videoinput');
      setDevices({ audio, video });
      if (audio.length) setSelectedDevices(prev => ({ ...prev, audio: audio[0].deviceId }));
      if (video.length) setSelectedDevices(prev => ({ ...prev, video: video[0].deviceId }));
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {};
      if (type === 'audio' || type === 'video') {
        constraints.audio = selectedDevices.audio ? { deviceId: selectedDevices.audio } : true;
      }
      if (type === 'video') {
        constraints.video = selectedDevices.video ? { deviceId: selectedDevices.video } : true;
      }

      let stream: MediaStream;
      if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      if (previewRef.current && type !== 'audio') {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        previewRef.current.play();
      }

      const options: MediaRecorderOptions = {};
      if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        onRecordingComplete?.(blob, url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(1000);
      setStatus('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (maxDuration && prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      onError?.(error as Error);
    }
  }, [type, mimeType, maxDuration, selectedDevices, onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setStatus('stopped');
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
      setStatus('recording');
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
    setStatus('idle');
    chunksRef.current = [];
  }, [recordedUrl]);

  const downloadRecording = useCallback(() => {
    if (!recordedUrl) return;
    const link = document.createElement('a');
    link.href = recordedUrl;
    link.download = `recording-${Date.now()}.${type === 'audio' ? 'webm' : 'webm'}`;
    link.click();
  }, [recordedUrl, type]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className={cn('media-recorder', className)}>
      {/* Preview */}
      {showPreview && type !== 'audio' && (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={previewRef}
            className="w-full h-full object-cover"
            playsInline
          />
          {status === 'recording' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-red-500 text-white rounded text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC
            </div>
          )}
        </div>
      )}

      {/* Audio visualizer placeholder */}
      {type === 'audio' && status === 'recording' && (
        <div className="h-20 bg-muted rounded-lg mb-4 flex items-center justify-center">
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recorded preview */}
      {recordedUrl && status === 'stopped' && (
        <div className="mb-4">
          {type === 'audio' ? (
            <audio src={recordedUrl} controls className="w-full" />
          ) : (
            <video src={recordedUrl} controls className="w-full rounded-lg" />
          )}
        </div>
      )}

      {/* Timer */}
      {showTimer && (status === 'recording' || status === 'paused') && (
        <div className="text-center mb-4">
          <span className={cn('text-3xl font-mono', status === 'recording' && 'text-red-500')}>
            {formatTime(duration)}
          </span>
          {maxDuration && (
            <span className="text-muted-foreground"> / {formatTime(maxDuration)}</span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {status === 'idle' && (
          <>
            {showSettings && (
              <button
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                className="p-3 rounded-full border hover:bg-accent"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={startRecording}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              {type === 'audio' ? <Mic className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          </>
        )}

        {status === 'recording' && (
          <>
            <button onClick={pauseRecording} className="p-3 rounded-full border hover:bg-accent">
              <Pause className="h-5 w-5" />
            </button>
            <button onClick={stopRecording} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600">
              <Square className="h-6 w-6" />
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button onClick={resumeRecording} className="p-3 rounded-full border hover:bg-accent">
              <Play className="h-5 w-5" />
            </button>
            <button onClick={stopRecording} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600">
              <Square className="h-6 w-6" />
            </button>
          </>
        )}

        {status === 'stopped' && recordedUrl && (
          <>
            <button onClick={discardRecording} className="p-3 rounded-full border hover:bg-accent text-red-500">
              <Trash2 className="h-5 w-5" />
            </button>
            <button onClick={startRecording} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600">
              {type === 'audio' ? <Mic className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
            <button onClick={downloadRecording} className="p-3 rounded-full border hover:bg-accent">
              <Download className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Device settings */}
      {showDeviceSettings && status === 'idle' && (
        <div className="mt-4 p-4 border rounded-lg space-y-3">
          {(type === 'audio' || type === 'video') && devices.audio.length > 0 && (
            <div>
              <label className="text-sm font-medium">Microfone</label>
              <select
                value={selectedDevices.audio}
                onChange={(e) => setSelectedDevices(prev => ({ ...prev, audio: e.target.value }))}
                className="w-full mt-1 p-2 border rounded bg-background"
              >
                {devices.audio.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microfone'}</option>
                ))}
              </select>
            </div>
          )}
          {type === 'video' && devices.video.length > 0 && (
            <div>
              <label className="text-sm font-medium">Câmera</label>
              <select
                value={selectedDevices.video}
                onChange={(e) => setSelectedDevices(prev => ({ ...prev, video: e.target.value }))}
                className="w-full mt-1 p-2 border rounded bg-background"
              >
                {devices.video.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Câmera'}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { MediaRecorderComponent as MediaRecorder };
export default MediaRecorderComponent;
