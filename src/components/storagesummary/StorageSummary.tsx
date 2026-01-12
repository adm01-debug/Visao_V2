import React from 'react';
import { cn } from '@/lib/utils';
import { HardDrive } from 'lucide-react';

interface StorageSummaryProps {
  used: number;
  total: number;
  recordings?: number;
  snapshots?: number;
  className?: string;
}

function formatSize(gb: number): string {
  return gb >= 1000 ? `${(gb/1000).toFixed(1)} TB` : `${gb.toFixed(0)} GB`;
}

export function StorageSummary({ used, total, recordings, snapshots, className }: StorageSummaryProps) {
  const pct = Math.round((used / total) * 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <HardDrive className="h-5 w-5 text-primary" />
        <span className="font-medium">Armazenamento</span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <span className="text-2xl font-bold">{formatSize(used)}</span>
        <span className="text-muted-foreground">/ {formatSize(total)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className={cn('h-full', color)} style={{ width: `${pct}%` }} />
      </div>
      {(recordings || snapshots) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {recordings && <div><span className="text-muted-foreground">Gravações:</span> <span className="font-medium">{recordings}</span></div>}
          {snapshots && <div><span className="text-muted-foreground">Snapshots:</span> <span className="font-medium">{snapshots}</span></div>}
        </div>
      )}
    </div>
  );
}

export default StorageSummary;
