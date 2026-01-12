import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Mic, Square, Play, Pause, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  className?: string;
}

export function VoiceRecorder({ onRecordingComplete, className }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    
    mediaRecorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioUrl(URL.createObjectURL(blob));
      onRecordingComplete?.(blob);
    };
    
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };
  const togglePlay = () => { if (audioRef.current) { playing ? audioRef.current.pause() : audioRef.current.play(); setPlaying(!playing); } };
  const deleteRecording = () => { setAudioUrl(null); setPlaying(false); };

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-center gap-3">
        {!audioUrl ? (
          <Button size="lg" variant={recording ? 'destructive' : 'default'} className="rounded-full w-16 h-16"
            onClick={recording ? stopRecording : startRecording}>
            {recording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
        ) : (
          <>
            <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
            <Button variant="outline" size="icon" onClick={togglePlay}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button variant="outline" size="icon" onClick={deleteRecording}><Trash2 className="h-4 w-4" /></Button>
            <a href={audioUrl} download="recording.webm"><Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button></a>
          </>
        )}
      </div>
      {recording && <p className="text-center mt-3 text-sm text-red-500 animate-pulse">● Gravando...</p>}
    </div>
  );
}

export default VoiceRecorder;
