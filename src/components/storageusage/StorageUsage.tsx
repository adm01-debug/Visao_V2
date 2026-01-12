import React from 'react';
import { cn } from '@/lib/utils';
import { HardDrive } from 'lucide-react';

interface StorageUsageProps {
  used: number;
  total: number;
  unit?: 'GB' | 'TB';
  showPercentage?: boolean;
  className?: string;
}

export function StorageUsage({ used, total, unit = 'GB', showPercentage = true, className }: StorageUsageProps) {
  const percentage = Math.round((used / total) * 100);
  const color = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-2">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Armazenamento</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div className={cn('h-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{used} {unit} usado</span>
        <span>{total} {unit} total</span>
      </div>
      {showPercentage && <p className="text-xs text-muted-foreground mt-1">{percentage}% utilizado</p>}
    </div>
  );
}

export default StorageUsage;
