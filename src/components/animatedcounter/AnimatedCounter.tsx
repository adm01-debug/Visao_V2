import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps { from?: number; to: number; duration?: number; suffix?: string; prefix?: string; className?: string; }

export function AnimatedCounter({ from = 0, to, duration = 2000, suffix = '', prefix = '', className }: AnimatedCounterProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    const steps = 60;
    const increment = (to - from) / steps;
    const interval = duration / steps;
    let current = from;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= to) || (increment < 0 && current <= to)) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [from, to, duration]);

  return <span className={cn('tabular-nums', className)}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default AnimatedCounter;
