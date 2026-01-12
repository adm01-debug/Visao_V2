import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface VersionBadgeProps {
  version: string;
  type?: 'stable' | 'beta' | 'alpha' | 'dev';
  showPrefix?: boolean;
  className?: string;
}

const typeConfig = {
  stable: { color: 'bg-green-100 text-green-800', label: '' },
  beta: { color: 'bg-yellow-100 text-yellow-800', label: 'Beta' },
  alpha: { color: 'bg-orange-100 text-orange-800', label: 'Alpha' },
  dev: { color: 'bg-red-100 text-red-800', label: 'Dev' }
};

export function VersionBadge({ version, type = 'stable', showPrefix = true, className }: VersionBadgeProps) {
  const config = typeConfig[type];
  
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Badge variant="outline" className={cn('font-mono', config.color)}>
        {showPrefix && 'v'}{version}
      </Badge>
      {config.label && <Badge variant="secondary" className="text-xs">{config.label}</Badge>}
    </span>
  );
}

export default VersionBadge;
