import React from 'react';
import { Modal } from '@/components/overlays/Modal';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title = 'Confirmar', message = 'Tem certeza?',
  confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'default'
}: ConfirmDialogProps) {
  const handleConfirm = () => { onConfirm(); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>{cancelText}</Button>
        <Button variant={variant === 'danger' ? 'destructive' : 'default'} onClick={handleConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
