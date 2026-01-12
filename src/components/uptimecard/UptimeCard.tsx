import React from 'react';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

interface UptimeCardProps {
  uptime: number;
  since?: Date;
  className?: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function UptimeCard({ uptime, since, className }: UptimeCardProps) {
  const pct = Math.min(uptime / 86400 * 100 / 30, 100);

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-green-500" />
        <span className="font-medium">Uptime</span>
      </div>
      <p className="text-2xl font-bold text-green-600">{formatUptime(uptime)}</p>
      {since && <p className="text-xs text-muted-foreground mt-1">Desde {since.toLocaleString('pt-BR')}</p>}
      <div className="h-1 bg-muted rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default UptimeCard;
