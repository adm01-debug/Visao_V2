import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, variant = 'default'
}: ConfirmDialogProps) {
  const handleCancel = () => { onCancel?.(); onOpenChange(false); };
  const handleConfirm = () => { onConfirm(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={handleConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default ConfirmDialog;
