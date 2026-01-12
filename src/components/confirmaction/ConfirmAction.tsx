import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmActionProps {
  trigger: React.ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  className?: string;
}

export function ConfirmAction({ trigger, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'default', onConfirm, className }: ConfirmActionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={cn('bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl', className)}>
            <div className="flex items-center gap-3 mb-4">
              {variant !== 'default' && <AlertTriangle className={cn('h-6 w-6', variant === 'danger' ? 'text-red-500' : 'text-yellow-500')} />}
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>{cancelLabel}</Button>
              <Button variant={variant === 'danger' ? 'destructive' : 'default'} onClick={() => { onConfirm(); setOpen(false); }}>{confirmLabel}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConfirmAction;
