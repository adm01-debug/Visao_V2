import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PomodoroProps {
  workMinutes?: number;
  breakMinutes?: number;
  onComplete?: (type: 'work' | 'break') => void;
  className?: string;
}

export function Pomodoro({ workMinutes = 25, breakMinutes = 5, onComplete, className }: PomodoroProps) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [time, setTime] = useState(workMinutes * 60);
  const [running, setRunning] = useState(false);

  const duration = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const progress = ((duration - time) / duration) * 100;

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          onComplete?.(mode);
          const next = mode === 'work' ? 'break' : 'work';
          setMode(next);
          return next === 'work' ? workMinutes * 60 : breakMinutes * 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, mode, workMinutes, breakMinutes, onComplete]);

  const reset = useCallback(() => { setRunning(false); setTime(mode === 'work' ? workMinutes * 60 : breakMinutes * 60); }, [mode, workMinutes, breakMinutes]);

  const format = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={cn('text-center space-y-4', className)}>
      <div className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-full', mode === 'work' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
        {mode === 'work' ? <Brain className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
        <span className="font-medium">{mode === 'work' ? 'Foco' : 'Pausa'}</span>
      </div>
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={283} strokeDashoffset={283 - (283 * progress) / 100}
            className={mode === 'work' ? 'text-red-500' : 'text-green-500'} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-4xl font-mono font-bold">{format(time)}</div>
      </div>
      <div className="flex justify-center gap-2">
        <Button onClick={() => setRunning(!running)}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
        <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default Pomodoro;
