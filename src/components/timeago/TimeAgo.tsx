import React from 'react';
import { cn } from '@/lib/utils';
interface TimeAgoProps {
  date: Date;
  className?: string;
}
export function TimeAgo({ date, className }: TimeAgoProps) {
  const getTimeAgo = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('pt-BR');
  };
  return <span className={cn('text-muted-foreground text-sm', className)}>{getTimeAgo(date)}</span>;
}
export default TimeAgo;
