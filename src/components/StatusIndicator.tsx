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
    pattern: 'rounded-sm', // square = inactive
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
  sm: { dot: 'w-2 h-2', icon: 'w-3 h-3', text: 'text-xs', badge: 'text-[9px] px-1.5 py-0.5 gap-1' },
  md: { dot: 'w-3 h-3', icon: 'w-4 h-4', text: 'text-sm', badge: 'text-[10px] px-2 py-0.5 gap-1.5' },
  lg: { dot: 'w-4 h-4', icon: 'w-5 h-5', text: 'text-sm', badge: 'text-xs px-2.5 py-1 gap-1.5' },
};

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          sizes.badge,
          status === 'online' && 'bg-success/15 text-success border border-success/30',
          status === 'offline' && 'bg-muted text-muted-foreground border border-border',
          status === 'alert' && 'bg-destructive/15 text-destructive border border-destructive/30',
          status === 'warning' && 'bg-warning/15 text-warning border border-warning/30',
        )}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        <Icon className={sizes.icon} aria-hidden="true" />
        <span>{config.label}</span>
      </div>
    );
  }

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
      <span className="sr-only">{config.label}</span>
    </div>
  );
}
