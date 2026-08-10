import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Re-export NotificationCenter from extracted module
export { NotificationCenter } from './notifications/NotificationCenter';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.duration || 4000);
  }, []);
  const removeToast = React.useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check className="w-5 h-5 text-success" />,
    error: <X className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-primary" />,
  };
  const bgColors: Record<ToastType, string> = {
    success: 'bg-success/10 border-success/30',
    error: 'bg-destructive/10 border-destructive/30',
    warning: 'bg-warning/10 border-warning/30',
    info: 'bg-primary/10 border-primary/30',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'pointer-events-auto rounded-lg border p-4 shadow-lg backdrop-blur-sm bg-background/95',
        bgColors[toast.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{toast.title}</p>
          {toast.message && <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>}
          {toast.action && (
            <motion.button
              className="text-sm font-medium text-primary mt-2 hover:underline"
              onClick={toast.action.onClick}
              whileHover={{ x: 2 }}
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>
        <motion.button
          className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
          onClick={() => onRemove(toast.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
}

export function NotificationBadge({
  count,
  max = 99,
  variant = 'default',
  className,
}: {
  count: number;
  max?: number;
  variant?: 'default' | 'dot';
  className?: string;
}) {
  if (count <= 0) return null;
  if (variant === 'dot')
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn('absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive', className)}
      />
    );
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold',
        className
      )}
    >
      {count > max ? `${max}+` : count}
    </motion.span>
  );
}

export function InlineNotification({
  type,
  title,
  message,
  action,
  onDismiss,
  className,
}: {
  type: ToastType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
}) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <Check className="w-5 h-5" />,
    error: <X className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };
  const styles: Record<ToastType, string> = {
    success: 'bg-success/10 border-success/30 text-success',
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-primary/10 border-primary/30 text-primary',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('rounded-lg border p-4', styles[type], className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{title}</p>
          {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
          {action && (
            <motion.button
              className="text-sm font-medium mt-2 hover:underline"
              onClick={action.onClick}
              whileHover={{ x: 2 }}
            >
              {action.label}
            </motion.button>
          )}
        </div>
        {onDismiss && (
          <motion.button
            className="flex-shrink-0 p-1 rounded-full hover:bg-background/50 transition-colors"
            onClick={onDismiss}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
