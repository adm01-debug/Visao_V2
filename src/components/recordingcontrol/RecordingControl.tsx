import React from 'react';
import { cn } from '@/lib/utils';
import { Circle, Square, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecordingControlProps {
  isRecording: boolean;
  isPaused?: boolean;
  duration?: number;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
}

export function RecordingControl({ isRecording, isPaused, duration = 0, onStart, onStop, onPause, onResume, className }: RecordingControlProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
      {isRecording && <div className={cn('w-3 h-3 rounded-full', isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse')} />}
      <span className="font-mono text-lg font-bold min-w-[80px]">{formatDuration(duration)}</span>
      <div className="flex gap-2">
        {!isRecording ? (
          <Button onClick={onStart} variant="destructive"><Circle className="h-4 w-4 mr-1 fill-current" />Gravar</Button>
        ) : (
          <>
            {isPaused ? (
              <Button onClick={onResume} variant="outline"><Play className="h-4 w-4 mr-1" />Continuar</Button>
            ) : (
              <Button onClick={onPause} variant="outline"><Pause className="h-4 w-4 mr-1" />Pausar</Button>
            )}
            <Button onClick={onStop} variant="secondary"><Square className="h-4 w-4 mr-1" />Parar</Button>
          </>
        )}
      </div>
    </div>
  );
}

export default RecordingControl;
