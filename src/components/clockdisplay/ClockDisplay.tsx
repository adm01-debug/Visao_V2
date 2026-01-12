import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface ClockDisplayProps {
  format?: '12h' | '24h';
  showSeconds?: boolean;
  showDate?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ClockDisplay({ format = '24h', showSeconds = false, showDate = false, showIcon = false, className }: ClockDisplayProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    let hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const seconds = time.getSeconds().toString().padStart(2, '0');
    let suffix = '';

    if (format === '12h') {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}${showSeconds ? ':' + seconds : ''}${suffix}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Clock className="h-4 w-4 text-muted-foreground" />}
      <div>
        <p className="font-mono text-lg font-medium">{formatTime()}</p>
        {showDate && <p className="text-xs text-muted-foreground">{time.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>}
      </div>
    </div>
  );
}

export default ClockDisplay;
