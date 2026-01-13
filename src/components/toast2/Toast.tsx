import React from 'react';
import { cn } from '@/lib/utils';
import { X, Check, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface ToastProps { type?: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; onClose?: () => void; className?: string; }

const config = {
  success: { icon: CheckCircle, bg: 'bg-green-500', border: 'border-green-600' },
  error: { icon: AlertCircle, bg: 'bg-red-500', border: 'border-red-600' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500', border: 'border-yellow-600' },
  info: { icon: Info, bg: 'bg-blue-500', border: 'border-blue-600' },
};

export function Toast({ type = 'info', title, message, onClose, className }: ToastProps) {
  const { icon: Icon, bg, border } = config[type];
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border shadow-lg bg-card', border, className)}>
      <div className={cn('p-1 rounded-full text-white', bg)}><Icon className="h-4 w-4" /></div>
      <div className="flex-1"><p className="font-medium">{title}</p>{message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}</div>
      {onClose && <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export default Toast;
