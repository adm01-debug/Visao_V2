import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  showLabels?: boolean;
  className?: string;
}

export function CountdownTimer({ targetDate, onComplete, showLabels = true, className }: CountdownTimerProps) {
  const calculate = useCallback(() => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);

  const [time, setTime] = useState(calculate());

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = calculate();
      setTime(newTime);
      if (newTime.days === 0 && newTime.hours === 0 && newTime.minutes === 0 && newTime.seconds === 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [calculate, onComplete]);

  const items = [
    { value: time.days, label: 'Dias' },
    { value: time.hours, label: 'Horas' },
    { value: time.minutes, label: 'Min' },
    { value: time.seconds, label: 'Seg' },
  ];

  return (
    <div className={cn('flex gap-4', className)}>
      {items.map((item, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl font-bold tabular-nums">{String(item.value).padStart(2, '0')}</div>
          {showLabels && <div className="text-xs text-muted-foreground">{item.label}</div>}
        </div>
      ))}
    </div>
  );
}

export default CountdownTimer;
