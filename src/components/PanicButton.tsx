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

export const PanicButton = React.forwardRef<HTMLDivElement, { className?: string }>(
  function PanicButton({ className }, _ref) {
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
            // `bottom-32` (128px) mantem o FAB acima da BottomNavigation (~60px +
            // safe-area) e fora da area de toque dos indicadores de pagina, que
            // terminam em ~124px (`bottom-20` + `touch-target` de 44px) e no
            // celular ficavam cobertos na regiao do ultimo atalho.
            'fixed bottom-32 right-6 z-40 h-16 w-16 rounded-full shadow-lg animate-pulse hover:animate-none',
            'border border-destructive/40',
            className
          )}
          // O contador aparece no badge; o axe exige que todo texto visível
          // esteja contido no nome acessível (parênteses são descartados na
          // comparação), então ele é escrito como palavra.
          aria-label={
            unresolvedCount > 0
              ? `Botão de Pânico - Acionar emergência - ${unresolvedCount} pendentes`
              : 'Botão de Pânico - Acionar emergência'
          }
        >
          <ShieldAlert className="h-8 w-8" />
          {unresolvedCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
            >
              {unresolvedCount}
            </span>
          )}
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent className="border-destructive/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-6 w-6" />
                Confirmar Alerta de Pânico
              </AlertDialogTitle>
              <AlertDialogDescription>
                Isso enviará um alerta de pânico imediato com sua localização para toda a equipe de
                segurança.
                <br />
                <br />
                <strong>Essa ação não pode ser desfeita.</strong> Use apenas em situações de
                emergência real.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePanic}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
);

export default PanicButton;
