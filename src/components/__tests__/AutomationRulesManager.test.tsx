import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { AutomationRulesManager } from '../AutomationRulesManager';

/** O componente usa useQuery; sem provider o React Query lança em runtime. */
function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('@/hooks/useRules', () => ({
  useRules: () => ({
    rules: [],
    loading: false,
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCameras', () => ({
  useCameras: () => ({ cameras: [], loading: false }),
}));

describe('AutomationRulesManager', () => {
  it('renderiza sem erros com lista vazia de regras', () => {
    const { container } = renderWithQueryClient(<AutomationRulesManager />);
    expect(container.firstChild).toBeTruthy();
  });
});
