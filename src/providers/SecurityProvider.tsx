/**
 * Security Provider
 * Provider para gerenciamento de segurança e restrição de IP
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { IP_WHITELIST_CONFIG } from '@/config/ipWhitelist';
import { checkIPWhitelist, type IPCheckResult } from '@/middleware/ipWhitelist';
import { AccessDenied } from '@/components/AccessDenied';

interface SecurityContextType {
  isAuthenticated: boolean;
  isIPAllowed: boolean;
  isAdmin: boolean;
  clientIP: string | null;
  isLoading: boolean;
  error: string | null;
  checkAccess: () => Promise<void>;
  logout: () => void;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

interface SecurityProviderProps {
  children: ReactNode;
  requireIPCheck?: boolean;
  showBlockedPage?: boolean;
}

export const SecurityProvider = ({
  children,
  requireIPCheck = true,
  showBlockedPage = true,
}: SecurityProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isIPAllowed, setIsIPAllowed] = useState(!IP_WHITELIST_CONFIG.enabled);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!requireIPCheck || !IP_WHITELIST_CONFIG.enabled) {
      setIsIPAllowed(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obter IP do cliente
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ip = ipData.ip;
      setClientIP(ip);

      // Verificar whitelist
      const result: IPCheckResult = checkIPWhitelist(ip);
      
      setIsIPAllowed(result.allowed);
      setIsAdmin(result.isAdmin);

      if (!result.allowed) {
        setError(result.reason);
      }
    } catch (err) {
      // Em caso de erro, bloqueia por segurança
      setIsIPAllowed(false);
      setError('Erro ao verificar acesso');
      console.error('Security check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [requireIPCheck]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    // Limpar tokens, sessão, etc.
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
  }, []);

  const value: SecurityContextType = {
    isAuthenticated,
    isIPAllowed,
    isAdmin,
    clientIP,
    isLoading,
    error,
    checkAccess,
    logout,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Blocked state
  if (!isIPAllowed && showBlockedPage) {
    return <AccessDenied onRetry={checkAccess} />;
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

// Hook para usar o contexto de segurança
export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// HOC para proteger páginas
export const withSecurity = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function SecuredComponent(props: P) {
    return (
      <SecurityProvider>
        <WrappedComponent {...props} />
      </SecurityProvider>
    );
  };
};

export default SecurityProvider;
