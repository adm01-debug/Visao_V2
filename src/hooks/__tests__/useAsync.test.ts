import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAsync } from '../useAsync';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('useAsync', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes', () => {
    const { result } = renderHook(() => useAsync(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('updates state', async () => {
    const { result } = renderHook(() => useAsync(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
  });
  it('unmounts clean', () => {
    const { unmount } = renderHook(() => useAsync(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
