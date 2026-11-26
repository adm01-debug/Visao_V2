import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
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
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  // A confirmacao pertence a tela que a abriu: navegar com ela aberta deixaria
  // um "Confirmar" armado limpando os filtros da tela anterior.
  useEffect(() => {
    setOpen(false);
    setRequest(null);
    returnFocusRef.current = null;
  }, [pathname]);

  const requestConfirmation = useCallback((req: ConfirmationRequest) => {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
    setRequest(req);
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    request?.onConfirm();
    setOpen(false);
  }, [request]);

  // O dialogo e aberto fora de um gatilho Radix, entao a restauracao padrao de
  // foco nao tem alvo: sem isto o teclado reinicia a navegacao no body.
  const handleCloseAutoFocus = useCallback((event: Event) => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target && target.isConnected) {
      event.preventDefault();
      target.focus();
    }
  }, []);

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
          onCloseAutoFocus={handleCloseAutoFocus}
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
