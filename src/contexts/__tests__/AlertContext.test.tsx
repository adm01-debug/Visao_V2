import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider, useAlerts } from '../AlertContext';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null })
      })
    })
  }
}));

function TestComponent() {
  const { alerts } = useAlerts();
  return (
    <div>
      <span data-testid="alerts-count">{alerts?.length ?? 0}</span>
    </div>
  );
}

describe('AlertContext', () => {
  it('provides alerts context', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <TestComponent />
        </AlertProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('alerts-count')).toBeInTheDocument();
  });

  it('initializes with empty alerts', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <TestComponent />
        </AlertProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('alerts-count')).toHaveTextContent('0');
  });
});
