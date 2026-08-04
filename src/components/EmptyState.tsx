import React from 'react';
import { LucideIcon, Inbox, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = 'md',
}) => {
  const sizeConfig = {
    sm: {
      container: 'py-8',
      ring: 'w-16 h-16',
      icon: 'w-12 h-12',
      title: 'text-base',
      iconInner: 'w-6 h-6',
      brand: 'w-3 h-3',
    },
    md: {
      container: 'py-16',
      ring: 'w-24 h-24',
      icon: 'w-20 h-20',
      title: 'text-lg',
      iconInner: 'w-10 h-10',
      brand: 'w-4 h-4',
    },
    lg: {
      container: 'py-24',
      ring: 'w-32 h-32',
      icon: 'w-28 h-28',
      title: 'text-xl',
      iconInner: 'w-14 h-14',
      brand: 'w-5 h-5',
    },
  };

  const s = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        s.container,
        className
      )}
      role="status"
      aria-label={`${title}${description ? `. ${description}` : ''}`}
    >
      {/* Branded icon with decorative rings and shield watermark */}
      <div className="relative mb-6">
        <div className={cn('rounded-full bg-primary/5 flex items-center justify-center', s.ring)}>
          <div
            className={cn('rounded-full bg-primary/10 flex items-center justify-center', s.icon)}
          >
            <Icon className={cn('text-primary/60', s.iconInner)} aria-hidden="true" />
          </div>
        </div>
        {/* Decorative dots */}
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/20 animate-pulse"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-primary/15"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 -right-4 w-1.5 h-1.5 rounded-full bg-primary/10"
          aria-hidden="true"
        />
        {/* Brand watermark */}
        <Shield
          className={cn('absolute bottom-0 right-0 text-primary/20', s.brand)}
          aria-hidden="true"
        />
      </div>

      <h3 className={cn('font-semibold text-foreground mb-2', s.title)}>{title}</h3>

      {description && (
        <p className="text-muted-foreground text-sm max-w-md mb-6 leading-relaxed">{description}</p>
      )}

      <div className="flex items-center gap-3" role="group" aria-label="Ações disponíveis">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
