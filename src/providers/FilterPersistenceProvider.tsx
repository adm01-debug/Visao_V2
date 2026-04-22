import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ConfirmationRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

interface FilterPersistenceContextValue {
  requestConfirmation: (req: ConfirmationRequest) => void;
}

const FilterPersistenceContext = createContext<FilterPersistenceContextValue | null>(null);

export function FilterPersistenceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [open, setOpen] = useState(false);

  const requestConfirmation = useCallback((req: ConfirmationRequest) => {
    setRequest(req);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    request?.onConfirm();
    setOpen(false);
  }, [request]);

  const value = useMemo(() => ({ requestConfirmation }), [requestConfirmation]);

  return (
    <FilterPersistenceContext.Provider value={value}>
      {children}
      {request && (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={request.title}
          description={request.description}
          confirmLabel={request.confirmLabel ?? 'Confirmar'}
          cancelLabel={request.cancelLabel ?? 'Cancelar'}
          variant="destructive"
          onConfirm={handleConfirm}
        />
      )}
    </FilterPersistenceContext.Provider>
  );
}

export function useFilterConfirmation(): FilterPersistenceContextValue {
  const ctx = useContext(FilterPersistenceContext);
  if (!ctx) {
    // Fallback: sem provider, executa direto sem confirmação visual
    return {
      requestConfirmation: (req) => req.onConfirm(),
    };
  }
  return ctx;
}
