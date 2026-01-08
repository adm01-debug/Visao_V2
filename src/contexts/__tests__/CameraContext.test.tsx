import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CameraProvider, useCameraContext } from '../CameraContext';

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
  const { cameras, selectedCamera } = useCameraContext();
  return (
    <div>
      <span data-testid="cameras-count">{cameras.length}</span>
      <span data-testid="selected">{selectedCamera ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('CameraContext', () => {
  it('provides cameras context', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <CameraProvider>
          <TestComponent />
        </CameraProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('cameras-count')).toBeInTheDocument();
  });

  it('initializes with no selected camera', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    render(
      <QueryClientProvider client={queryClient}>
        <CameraProvider>
          <TestComponent />
        </CameraProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId('selected')).toHaveTextContent('no');
  });
});
