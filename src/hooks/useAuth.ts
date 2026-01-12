import { useState, useCallback, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface UseAuthOptions {
  onLogin?: (user: User) => void;
  onLogout?: () => void;
}

export function useAuth(options: UseAuthOptions = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulação - em produção, chamaria API real
      await new Promise(r => setTimeout(r, 1000));
      const loggedUser: User = { id: '1', name: 'Usuário', email, role: 'admin' };
      setUser(loggedUser);
      options.onLogin?.(loggedUser);
      return loggedUser;
    } catch (err) {
      setError('Credenciais inválidas');
      throw err;
    } finally { setIsLoading(false); }
  }, [options]);

  const logout = useCallback(() => {
    setUser(null);
    options.onLogout?.();
  }, [options]);

  const isAuthenticated = !!user;
  const hasRole = useCallback((role: string) => user?.role === role, [user]);

  useEffect(() => {
    // Verificar sessão existente
    setIsLoading(false);
  }, []);

  return { user, isLoading, error, isAuthenticated, login, logout, hasRole };
}

export default useAuth;
