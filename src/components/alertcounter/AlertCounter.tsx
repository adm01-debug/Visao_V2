import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface AlertCounts {
  critical?: number;
  warning?: number;
  info?: number;
  success?: number;
}

interface AlertCounterProps {
  counts: AlertCounts;
  onClick?: (type: keyof AlertCounts) => void;
  className?: string;
}

const config = {
  critical: { icon: AlertCircle, color: 'text-red-500 bg-red-50 hover:bg-red-100' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' },
  info: { icon: Info, color: 'text-blue-500 bg-blue-50 hover:bg-blue-100' },
  success: { icon: CheckCircle, color: 'text-green-500 bg-green-50 hover:bg-green-100' },
};

export function AlertCounter({ counts, onClick, className }: AlertCounterProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {(Object.keys(config) as (keyof AlertCounts)[]).map(type => {
        const count = counts[type] || 0;
        if (count === 0) return null;
        const { icon: Icon, color } = config[type];
        return (
          <button key={type} onClick={() => onClick?.(type)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors', color)}>
            <Icon className="h-4 w-4" />
            <span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AlertCounter;
