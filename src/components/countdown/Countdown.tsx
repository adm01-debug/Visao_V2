import React from 'react';
import { cn } from '@/lib/utils';
import { useCountdown } from '@/hooks/useCountdown';

interface CountdownProps {
  seconds: number;
  onComplete?: () => void;
  format?: 'full' | 'minutes' | 'seconds';
  className?: string;
}

function formatTime(seconds: number, format: string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (format === 'seconds') return `${seconds}s`;
  if (format === 'minutes') return `${m}:${s.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Countdown({ seconds: initialSeconds, onComplete, format = 'full', className }: CountdownProps) {
  const { seconds, isRunning, start, pause, reset } = useCountdown(initialSeconds);

  React.useEffect(() => {
    if (seconds === 0 && onComplete) onComplete();
  }, [seconds, onComplete]);

  React.useEffect(() => { start(); }, [start]);

  return (
    <div className={cn('font-mono text-2xl', className)}>
      {formatTime(seconds, format)}
    </div>
  );
}

export default Countdown;
