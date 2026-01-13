import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Activity, Gauge, Signal } from 'lucide-react';

interface PerformanceMeterProps { label: string; value: number; maxValue?: number; unit?: string; status?: 'good' | 'warning' | 'critical'; className?: string; }

const statusColors = { good: 'text-green-500', warning: 'text-yellow-500', critical: 'text-red-500' };

export function PerformanceMeter({ label, value, maxValue = 100, unit = '', status = 'good', className }: PerformanceMeterProps) {
  const pct = (value / maxValue) * 100;
  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{label}</span><Activity className={cn('h-4 w-4', statusColors[status])} /></div>
      <p className={cn('text-2xl font-bold', statusColors[status])}>{value}{unit}</p>
      <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden"><div className={cn('h-full rounded-full transition-all', status === 'good' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default PerformanceMeter;
