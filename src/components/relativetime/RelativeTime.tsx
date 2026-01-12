import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from '@/lib/dateHelpers';

interface RelativeTimeProps {
  date: Date | string;
  updateInterval?: number;
  className?: string;
}

export function RelativeTime({ date, updateInterval = 60000, className }: RelativeTimeProps) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), updateInterval);
    return () => clearInterval(interval);
  }, [updateInterval]);

  const d = typeof date === 'string' ? new Date(date) : date;

  return <time dateTime={d.toISOString()} className={className}>{formatDistanceToNow(d)}</time>;
}

export default RelativeTime;
