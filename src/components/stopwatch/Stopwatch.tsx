import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StopwatchProps {
  onLap?: (time: number) => void;
  className?: string;
}

export function Stopwatch({ onLap, className }: StopwatchProps) {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => setTime(t => t + 10), 10);
  }, []);

  const stop = useCallback(() => { setRunning(false); clearInterval(intervalRef.current); }, []);
  const reset = useCallback(() => { stop(); setTime(0); setLaps([]); }, [stop]);
  const lap = useCallback(() => { setLaps(l => [...l, time]); onLap?.(time); }, [time, onLap]);

  const format = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-5xl font-mono font-bold text-center tabular-nums">{format(time)}</div>
      <div className="flex justify-center gap-2">
        {running ? <Button onClick={stop}><Pause className="h-4 w-4 mr-1" />Pausar</Button> : <Button onClick={start}><Play className="h-4 w-4 mr-1" />Iniciar</Button>}
        <Button variant="outline" onClick={lap} disabled={!running}><Flag className="h-4 w-4 mr-1" />Volta</Button>
        <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
      </div>
      {laps.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-auto">{laps.map((l, i) => (
          <div key={i} className="flex justify-between text-sm px-2 py-1 bg-muted rounded"><span>Volta {i + 1}</span><span className="font-mono">{format(l)}</span></div>
        ))}</div>
      )}
    </div>
  );
}

export default Stopwatch;
