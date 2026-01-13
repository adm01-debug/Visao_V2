import React from 'react';
import { cn } from '@/lib/utils';

interface FeatureFlagProps { enabled: boolean; name: string; description?: string; onToggle?: (enabled: boolean) => void; className?: string; }

export function FeatureFlag({ enabled, name, description, onToggle, className }: FeatureFlagProps) {
  return (
    <div className={cn('flex items-center justify-between p-4 rounded-lg border', className)}>
      <div><p className="font-medium">{name}</p>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <button onClick={() => onToggle?.(!enabled)} className={cn('relative w-11 h-6 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform', enabled ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

export default FeatureFlag;
