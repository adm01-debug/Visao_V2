import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface AlertSummaryProps {
  critical: number;
  warning: number;
  info: number;
  resolved: number;
  className?: string;
}

export function AlertSummary({ critical, warning, info, resolved, className }: AlertSummaryProps) {
  const items = [
    { label: 'Críticos', count: critical, icon: AlertCircle, color: 'text-red-500 bg-red-50' },
    { label: 'Avisos', count: warning, icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-50' },
    { label: 'Info', count: info, icon: Info, color: 'text-blue-500 bg-blue-50' },
    { label: 'Resolvidos', count: resolved, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
  ];

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {items.map(item => (
        <div key={item.label} className={cn('p-3 rounded-lg text-center', item.color)}>
          <item.icon className="h-5 w-5 mx-auto mb-1" />
          <p className="text-2xl font-bold">{item.count}</p>
          <p className="text-xs">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default AlertSummary;
