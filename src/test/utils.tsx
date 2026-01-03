/**
 * VISÃO - Utilitários de Teste
 * Wrappers e helpers para testes de integração
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MockAuthProvider, mockUser } from './mocks/auth';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof mockUser | null;
  loading?: boolean;
  initialRoute?: string;
}

// All-in-one wrapper for integration tests
export function AllProviders({ 
  children, 
  user = mockUser, 
  loading = false 
}: WrapperProps & { user?: typeof mockUser | null; loading?: boolean }) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockAuthProvider user={user} loading={loading}>
          {children}
        </MockAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { user = mockUser, loading = false, ...renderOptions } = options;
  
  function Wrapper({ children }: WrapperProps) {
    return (
      <AllProviders user={user} loading={loading}>
        {children}
      </AllProviders>
    );
  }
  
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: createTestQueryClient(),
  };
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Re-export testing library utilities
export * from '@testing-library/react';
export { renderWithProviders as render };
