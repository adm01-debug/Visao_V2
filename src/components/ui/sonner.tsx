import React from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeProvider';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = React.forwardRef<HTMLDivElement, ToasterProps>(function ToasterSonner(props, _ref) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
          success: 'group-[.toaster]:border-success/30 group-[.toaster]:bg-success/5',
          error: 'group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5',
          warning: 'group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/5',
          info: 'group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/5',
        },
      }}
      {...props}
    />
  );
});

export { Toaster, toast };
