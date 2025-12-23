import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRuleActions } from '../useRuleActions';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('useRuleActions', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes correctly', () => {
    const { result } = renderHook(() => useRuleActions(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('handles updates', async () => {
    const { result } = renderHook(() => useRuleActions(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
  });
  it('cleans up', () => {
    const { unmount } = renderHook(() => useRuleActions(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
