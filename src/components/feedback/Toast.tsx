import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
  className?: string;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
};

export function Toast({ type, message, onClose, className }: ToastProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-lg border-l-4', styles[type], className)}>
      {icons[type]}
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default Toast;
