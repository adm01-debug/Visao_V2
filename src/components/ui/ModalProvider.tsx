import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Modal Types
type ModalType = 'default' | 'danger' | 'success' | 'warning' | 'info';

interface ModalOptions {
  title: string;
  description?: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  children?: ReactNode;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
  showConfirm: (options: Omit<ModalOptions, 'type'>) => Promise<boolean>;
  showAlert: (title: string, description?: string, type?: ModalType) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

const typeConfig = {
  default: {
    icon: null,
    iconClass: '',
    confirmClass: ''
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    confirmClass: 'bg-destructive hover:bg-destructive/90'
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-success',
    confirmClass: 'bg-success hover:bg-success/90'
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-warning',
    confirmClass: 'bg-warning hover:bg-warning/90'
  },
  info: {
    icon: Info,
    iconClass: 'text-primary',
    confirmClass: ''
  }
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const showModal = useCallback((options: ModalOptions) => {
    setModal(options);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const showConfirm = useCallback((options: Omit<ModalOptions, 'type'>) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setModal({
        ...options,
        type: 'danger',
        showCancel: true,
        onConfirm: async () => {
          if (options.onConfirm) {
            await options.onConfirm();
          }
          resolve(true);
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
        }
      });
    });
  }, []);

  const showAlert = useCallback((title: string, description?: string, type: ModalType = 'info') => {
    return new Promise<void>((resolve) => {
      setModal({
        title,
        description,
        type,
        showCancel: false,
        onConfirm: () => resolve()
      });
    });
  }, []);

  const handleConfirm = async () => {
    if (modal?.onConfirm) {
      setIsLoading(true);
      try {
        await modal.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    hideModal();
  };

  const handleCancel = () => {
    modal?.onCancel?.();
    hideModal();
  };

  const config = modal?.type ? typeConfig[modal.type] : typeConfig.default;
  const Icon = config.icon;

  return (
    <ModalContext.Provider value={{ showModal, hideModal, showConfirm, showAlert }}>
      {children}
      
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-card rounded-xl shadow-2xl border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {Icon && (
                      <div className={cn("mt-0.5", config.iconClass)}>
                        <Icon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold">{modal.title}</h2>
                      {modal.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {modal.description}
                        </p>
                      )}
                      {modal.children}
                    </div>
                    <button
                      onClick={handleCancel}
                      className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 bg-muted/30 border-t">
                  {modal.showCancel && (
                    <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                      {modal.cancelText || 'Cancelar'}
                    </Button>
                  )}
                  <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={config.confirmClass}
                  >
                    {isLoading ? 'Aguarde...' : modal.confirmText || 'OK'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}
