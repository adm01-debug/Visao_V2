import { setGlobalTraceId } from '@/lib/logger';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente para resetar o traceId global em cada mudança de rota.
 */
export const TraceIdManager = () => {
  const location = useLocation();

  useEffect(() => {
    // Resetar o traceId ao navegar para garantir que logs de UI
    // não fiquem atrelados ao traceId de uma requisição de rede anterior.
    setGlobalTraceId(undefined);
  }, [location.pathname]);

  return null;
};
