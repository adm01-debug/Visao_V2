import React from 'react';
import { cn } from '@/lib/utils';
import { Activity, Clock, Zap, AlertCircle } from 'lucide-react';

interface APIStatusCardProps { name: string; status: 'healthy' | 'degraded' | 'down'; latency: number; uptime: number; requests: number; className?: string; }

const statusConfig = { healthy: { color: 'text-green-500', bg: 'bg-green-50', label: 'Saudável' }, degraded: { color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Degradado' }, down: { color: 'text-red-500', bg: 'bg-red-50', label: 'Offline' } };

export function APIStatusCard({ name, status, latency, uptime, requests, className }: APIStatusCardProps) {
  const config = statusConfig[status];
  
  return (
    <div className={cn('p-4 rounded-lg border', config.bg, className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">{name}</span>
        <span className={cn('px-2 py-1 rounded text-xs font-medium', config.color)}>{config.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold">{latency}ms</p><p className="text-xs text-muted-foreground">Latência</p></div>
        <div><Activity className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold">{uptime}%</p><p className="text-xs text-muted-foreground">Uptime</p></div>
        <div><Zap className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold">{requests.toLocaleString()}</p><p className="text-xs text-muted-foreground">Requests</p></div>
      </div>
    </div>
  );
}

export default APIStatusCard;
