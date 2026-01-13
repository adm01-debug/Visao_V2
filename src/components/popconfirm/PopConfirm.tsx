import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PopConfirmProps { title: string; description?: string; onConfirm: () => void; onCancel?: () => void; children: React.ReactNode; className?: string; }

export function PopConfirm({ title, description, onConfirm, onCancel, children, className }: PopConfirmProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => { onConfirm(); setOpen(false); };
  const handleCancel = () => { onCancel?.(); setOpen(false); };

  return (
    <div className="relative inline-block">
      <div onClick={() => setOpen(true)}>{children}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleCancel} />
          <div className={cn('absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-4 w-64 bg-popover border rounded-lg shadow-lg', className)}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
              <div><p className="font-medium">{title}</p>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>Cancelar</Button>
              <Button size="sm" onClick={handleConfirm}>Confirmar</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PopConfirm;
