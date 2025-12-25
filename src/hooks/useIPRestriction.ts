/**
 * useIPRestriction Hook
 * Hook para verificar restrição de IP no cliente
 */

import { useState, useEffect, useCallback } from 'react';
import { IP_WHITELIST_CONFIG } from '@/config/ipWhitelist';

interface IPRestrictionState {
  isAllowed: boolean;
  isLoading: boolean;
  error: string | null;
  clientIP: string | null;
  isAdmin: boolean;
  checkedAt: Date | null;
}

interface UseIPRestrictionOptions {
  checkOnMount?: boolean;
  redirectOnBlock?: boolean;
  redirectUrl?: string;
  onBlock?: (ip: string) => void;
  onAllow?: (ip: string) => void;
}

export const useIPRestriction = (options: UseIPRestrictionOptions = {}) => {
  const {
    checkOnMount = true,
    redirectOnBlock = false,
    redirectUrl = '/access-denied',
    onBlock,
    onAllow,
  } = options;

  const [state, setState] = useState<IPRestrictionState>({
    isAllowed: !IP_WHITELIST_CONFIG.enabled, // Se desabilitado, permite por padrão
    isLoading: true,
    error: null,
    clientIP: null,
    isAdmin: false,
    checkedAt: null,
  });

  const checkIP = useCallback(async () => {
    if (!IP_WHITELIST_CONFIG.enabled) {
      setState(prev => ({
        ...prev,
        isAllowed: true,
        isLoading: false,
        checkedAt: new Date(),
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/security/check-ip', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check IP');
      }

      const data = await response.json();

      setState({
        isAllowed: data.allowed,
        isLoading: false,
        error: null,
        clientIP: data.ip,
        isAdmin: data.isAdmin || false,
        checkedAt: new Date(),
      });

      if (data.allowed) {
        onAllow?.(data.ip);
      } else {
        onBlock?.(data.ip);
        
        if (redirectOnBlock && typeof window !== 'undefined') {
          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [onAllow, onBlock, redirectOnBlock, redirectUrl]);

  useEffect(() => {
    if (checkOnMount) {
      checkIP();
    }
  }, [checkOnMount, checkIP]);

  const recheck = useCallback(() => {
    return checkIP();
  }, [checkIP]);

  return {
    ...state,
    recheck,
    isRestricted: IP_WHITELIST_CONFIG.enabled,
  };
};

// Hook simplificado para proteção de rotas
export const useProtectedRoute = () => {
  const { isAllowed, isLoading, clientIP } = useIPRestriction({
    checkOnMount: true,
    redirectOnBlock: true,
    redirectUrl: '/acesso-negado',
  });

  return {
    canAccess: isAllowed,
    isChecking: isLoading,
    userIP: clientIP,
  };
};

// HOC para proteger componentes
export const withIPRestriction = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType
) => {
  return function IPProtectedComponent(props: P) {
    const { isAllowed, isLoading } = useIPRestriction();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (!isAllowed) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-destructive">🚫</h1>
            <h2 className="text-2xl font-semibold">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Seu IP não está autorizado a acessar este sistema.
            </p>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default useIPRestriction;
