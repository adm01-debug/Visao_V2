import React from 'react';
import { cn } from '@/lib/utils';
import { Timer, Pause, Play, RotateCcw } from 'lucide-react';

interface CountdownTimerDisplayProps { hours: number; minutes: number; seconds: number; running?: boolean; onStart?: () => void; onPause?: () => void; onReset?: () => void; className?: string; }

export function CountdownTimerDisplay({ hours, minutes, seconds, running, onStart, onPause, onReset, className }: CountdownTimerDisplayProps) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <div className={cn('p-6 rounded-xl border bg-card text-center', className)}>
      <div className="flex items-center justify-center gap-2 mb-4">
        {[{ v: hours, l: 'h' }, { v: minutes, l: 'm' }, { v: seconds, l: 's' }].map((t, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-3xl font-bold text-muted-foreground">:</span>}
            <div className="bg-muted px-4 py-3 rounded-lg"><span className="text-4xl font-mono font-bold">{pad(t.v)}</span><span className="text-xs text-muted-foreground ml-1">{t.l}</span></div>
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        {running ? <button onClick={onPause} className="p-3 rounded-full bg-yellow-500 text-white"><Pause className="h-5 w-5" /></button> : <button onClick={onStart} className="p-3 rounded-full bg-green-500 text-white"><Play className="h-5 w-5" /></button>}
        <button onClick={onReset} className="p-3 rounded-full bg-muted"><RotateCcw className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export default CountdownTimerDisplay;
