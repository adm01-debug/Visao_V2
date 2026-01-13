import React from 'react';
import { cn } from '@/lib/utils';

interface MetricTileProps { icon: React.ReactNode; label: string; value: string | number; subtext?: string; color?: string; className?: string; }

export function MetricTile({ icon, label, value, subtext, color = 'bg-primary', className }: MetricTileProps) {
  return (
    <div className={cn('flex items-center gap-4 p-4 rounded-lg border bg-card', className)}>
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>{icon}</div>
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p>{subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}</div>
    </div>
  );
}

export default MetricTile;
