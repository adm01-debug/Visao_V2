import { cn } from '@/lib/utils';
import { CameraStatus } from '@/types/surveillance';
import { CheckCircle2, XCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

interface StatusIndicatorProps {
  status: CameraStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  online: {
    color: 'bg-success',
    ringColor: 'ring-success/30',
    label: 'Online',
    icon: CheckCircle2,
    iconColor: 'text-success',
    pattern: 'rounded-full', // solid circle = OK
  },
  offline: {
    color: 'bg-muted-foreground',
    ringColor: 'ring-muted-foreground/30',
    label: 'Offline',
    icon: XCircle,
    iconColor: 'text-muted-foreground',
    pattern: 'rounded-sm', // square = inactive (distinguishable shape)
  },
  alert: {
    color: 'bg-destructive',
    ringColor: 'ring-destructive/30',
    label: 'Alerta',
    icon: AlertOctagon,
    iconColor: 'text-destructive',
    pattern: 'rotate-45 rounded-none', // diamond = danger
  },
  warning: {
    color: 'bg-warning',
    ringColor: 'ring-warning/30',
    label: 'Atenção',
    icon: AlertTriangle,
    iconColor: 'text-warning',
    pattern: 'rounded-full border-2 border-current bg-transparent', // ring = warning
  },
};

const sizeConfig = {
  sm: { dot: 'w-2 h-2', icon: 'w-3 h-3', text: 'text-xs' },
  md: { dot: 'w-3 h-3', icon: 'w-4 h-4', text: 'text-sm' },
  lg: { dot: 'w-4 h-4', icon: 'w-5 h-5', text: 'text-sm' },
};

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2" role="status" aria-label={`Status: ${config.label}`}>
      {/* Color-blind safe: unique shape per status */}
      <span className="relative flex items-center justify-center">
        <span
          className={cn(
            config.color,
            sizes.dot,
            config.pattern,
            status === 'online' && 'animate-pulse',
            status === 'alert' && 'animate-pulse',
          )}
          aria-hidden="true"
        />
        {/* Outer ring for extra distinction */}
        {(status === 'alert' || status === 'warning') && (
          <span
            className={cn(
              'absolute inset-0 rounded-full ring-2',
              config.ringColor,
              status === 'alert' && 'animate-ping opacity-75',
            )}
            aria-hidden="true"
          />
        )}
      </span>
      {showLabel && (
        <span className={cn('flex items-center gap-1', sizes.text)}>
          <Icon className={cn(sizes.icon, config.iconColor)} aria-hidden="true" />
          <span className="text-muted-foreground">{config.label}</span>
        </span>
      )}
      {/* Screen reader only full description */}
      {!showLabel && <span className="sr-only">{config.label}</span>}
    </div>
  );
}
