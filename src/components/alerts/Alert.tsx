import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantConfig = {
  info: { icon: Info, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  warning: { icon: AlertCircle, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
};

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const { icon: Icon, bg, text } = variantConfig[variant];

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border', bg, text, className)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
