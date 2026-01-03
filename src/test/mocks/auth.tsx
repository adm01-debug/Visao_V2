/**
 * VISÃO - Mock do AuthContext para Testes
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface MockUser {
  id: string;
  email: string;
}

interface MockAuthContext {
  user: MockUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<MockAuthContext>({
  user: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const mockUser: MockUser = {
  id: 'user-1',
  email: 'test@test.com',
};

interface MockAuthProviderProps {
  children: ReactNode;
  user?: MockUser | null;
  loading?: boolean;
}

export function MockAuthProvider({ 
  children, 
  user = mockUser, 
  loading = false 
}: MockAuthProviderProps) {
  const value: MockAuthContext = {
    user,
    loading,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useMockAuth = () => useContext(AuthContext);
