import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider, useAlertContext } from '../AlertContext';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null })
      }),
      update: () => ({
        eq: () => ({ data: null, error: null })
      })
    })
  }
}));

function TestComponent() {
  const { alerts, unreadCount } = useAlertContext();
  return (
    <div>
      <span data-testid="alerts-count">{alerts?.length ?? 0}</span>
      <span data-testid="unread">{unreadCount}</span>
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

  it('tracks unread count', () => {
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
    
    expect(screen.getByTestId('unread')).toBeInTheDocument();
  });
});
