import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, AlertCircle, CheckCircle, X } from 'lucide-react';

type Severity = 'critical' | 'warning' | 'info' | 'success';

interface AlertEventProps {
  severity: Severity;
  title: string;
  message: string;
  timestamp: string;
  source?: string;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
}

const icons = { critical: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle };
const colors = { critical: 'border-red-500 bg-red-50', warning: 'border-yellow-500 bg-yellow-50', info: 'border-blue-500 bg-blue-50', success: 'border-green-500 bg-green-50' };
const iconColors = { critical: 'text-red-500', warning: 'text-yellow-500', info: 'text-blue-500', success: 'text-green-500' };

export function AlertEvent({ severity, title, message, timestamp, source, onDismiss, onClick, className }: AlertEventProps) {
  const Icon = icons[severity];

  return (
    <div onClick={onClick} className={cn('flex gap-3 p-3 rounded-lg border-l-4', colors[severity], onClick && 'cursor-pointer', className)}>
      <Icon className={cn('h-5 w-5 flex-shrink-0', iconColors[severity])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{title}</p>
          {onDismiss && <button onClick={(e) => { e.stopPropagation(); onDismiss(); }}><X className="h-4 w-4" /></button>}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
          <span>{timestamp}</span>
          {source && <span>• {source}</span>}
        </div>
      </div>
    </div>
  );
}

export default AlertEvent;
