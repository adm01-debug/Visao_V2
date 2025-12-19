import { cn } from '@/lib/utils';
import { CameraStatus } from '@/types/surveillance';

interface StatusIndicatorProps {
  status: CameraStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  online: {
    color: 'bg-success',
    label: 'Online',
  },
  offline: {
    color: 'bg-muted-foreground',
    label: 'Offline',
  },
  alert: {
    color: 'bg-destructive',
    label: 'Alerta',
  },
  warning: {
    color: 'bg-warning',
    label: 'Atenção',
  },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className={cn(
          'rounded-full animate-pulse',
          config.color,
          sizeConfig[size]
        )} 
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">{config.label}</span>
      )}
    </div>
  );
}
