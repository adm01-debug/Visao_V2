import React from 'react';
import { cn } from '@/lib/utils';
import { Mic, StopCircle, Pause, Play, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceMessageRecorderProps { recording?: boolean; duration?: number; audioUrl?: string; onStartRecording?: () => void; onStopRecording?: () => void; onSend?: () => void; onDiscard?: () => void; className?: string; }

export function VoiceMessageRecorder({ recording, duration = 0, audioUrl, onStartRecording, onStopRecording, onSend, onDiscard, className }: VoiceMessageRecorderProps) {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
      {!recording && !audioUrl ? (
        <Button variant="ghost" size="icon" onClick={onStartRecording}><Mic className="h-5 w-5" /></Button>
      ) : recording ? (
        <>
          <Button variant="destructive" size="icon" onClick={onStopRecording}><StopCircle className="h-5 w-5" /></Button>
          <div className="flex-1"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm">{formatTime(duration)}</span></div></div>
        </>
      ) : (
        <>
          <audio src={audioUrl} className="hidden" />
          <div className="flex-1 text-sm">{formatTime(duration)}</div>
          <Button variant="ghost" size="icon" onClick={onDiscard}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          <Button size="icon" onClick={onSend}><Send className="h-4 w-4" /></Button>
        </>
      )}
    </div>
  );
}

export default VoiceMessageRecorder;
