/**
 * VISÃO - Dialog/Drawer Responsivo
 * Dialog em desktop, Drawer em mobile
 */

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Largura máxima do dialog (desktop) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
};

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = 'lg',
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          maxWidthClasses[maxWidth],
          'max-h-[90vh] flex flex-col',
          className
        )}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            {children}
          </ScrollArea>
          
          {footer && (
            <DialogFooter className="mt-4 pt-4 border-t">
              {footer}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn('max-h-[90vh]', className)}>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4 overflow-auto" style={{ maxHeight: '60vh' }}>
          {children}
        </ScrollArea>
        
        {footer && (
          <DrawerFooter className="pt-4 border-t">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: 'left' | 'right' | 'top' | 'bottom';
  className?: string;
}

/**
 * Sheet responsivo - lateral em desktop, bottom em mobile
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'right',
  className,
}: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  // Em mobile, sempre usa drawer de baixo
  const actualSide = isDesktop ? side : 'bottom';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className={cn(
          actualSide === 'bottom' ? 'max-h-[85vh]' : 'h-full w-80',
          className
        )}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>{description}</DrawerDescription>
          )}
        </DrawerHeader>
        
        <ScrollArea className="flex-1 px-4 pb-4">
          {children}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
