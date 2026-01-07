import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AlertType = 'success' | 'warning' | 'error' | 'info';

interface AlertBannerProps {
  type?: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-success/10 border-success/20',
    iconClass: 'text-success',
    textClass: 'text-success'
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-warning/10 border-warning/20',
    iconClass: 'text-warning',
    textClass: 'text-warning'
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-destructive/10 border-destructive/20',
    iconClass: 'text-destructive',
    textClass: 'text-destructive'
  },
  info: {
    icon: Info,
    bgClass: 'bg-primary/10 border-primary/20',
    iconClass: 'text-primary',
    textClass: 'text-primary'
  }
};

export function AlertBanner({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className
}: AlertBannerProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        config.bgClass,
        className
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", config.iconClass)} />
      <div className="flex-1 min-w-0">
        {title && <p className={cn("font-medium", config.textClass)}>{title}</p>}
        <p className="text-sm text-foreground/80">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              "mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline",
              config.textClass
            )}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-black/5 rounded transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}

// Status indicator dot
interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'idle';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const statusColors = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  warning: 'bg-warning',
  error: 'bg-destructive',
  idle: 'bg-muted-foreground/50'
};

const statusSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
};

export function StatusDot({
  status,
  pulse = false,
  size = 'md',
  label,
  className
}: StatusDotProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex">
        <span className={cn(
          "rounded-full",
          statusColors[status],
          statusSizes[size]
        )} />
        {pulse && status === 'online' && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping",
            statusColors[status],
            "opacity-75"
          )} />
        )}
      </span>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// Connection status bar
interface ConnectionStatusProps {
  isOnline: boolean;
  className?: string;
}

export function ConnectionStatus({ isOnline, className }: ConnectionStatusProps) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 text-center text-sm font-medium shadow-lg",
            className
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Sem conexão com a internet
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Badge variants
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

const badgeVariants = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-600',
  outline: 'border border-border text-muted-foreground'
};

const badgeSizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm'
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className
}: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-medium rounded-full",
      badgeVariants[variant],
      badgeSizes[size],
      className
    )}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === 'default' && 'bg-primary',
          variant === 'success' && 'bg-success',
          variant === 'warning' && 'bg-warning',
          variant === 'error' && 'bg-destructive',
          variant === 'info' && 'bg-blue-500'
        )} />
      )}
      {children}
    </span>
  );
}
