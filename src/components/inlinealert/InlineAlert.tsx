import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface InlineAlertProps { type: 'info' | 'success' | 'warning' | 'error'; message: string; className?: string; }

const config = {
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  warning: { icon: AlertCircle, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
};

export function InlineAlert({ type, message, className }: InlineAlertProps) {
  const { icon: Icon, bg, text } = config[type];
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', bg, text, className)}>
      <Icon className="h-4 w-4 shrink-0" /><span className="text-sm">{message}</span>
    </div>
  );
}

export default InlineAlert;
