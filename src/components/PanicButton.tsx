import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePanicButton } from '@/hooks/usePanicButton';
import { cn } from '@/lib/utils';

export function PanicButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { triggerPanic, unresolvedCount } = usePanicButton();

  const handlePanic = () => {
    triggerPanic.mutate();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-lg animate-pulse hover:animate-none',
          'border border-destructive/40',
          className
        )}
        title="Botão de Pânico"
      >
        <ShieldAlert className="h-8 w-8" />
        {unresolvedCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unresolvedCount}
          </span>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              Confirmar Alerta de Pânico
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso enviará um alerta de pânico imediato com sua localização para toda a equipe de segurança.
              <br /><br />
              <strong>Essa ação não pode ser desfeita.</strong> Use apenas em situações de emergência real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePanic}
              className="bg-red-600 hover:bg-red-700"
              disabled={triggerPanic.isPending}
            >
              {triggerPanic.isPending ? 'Enviando...' : '🚨 ACIONAR PÂNICO'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PanicButton;
