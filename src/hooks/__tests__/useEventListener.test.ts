import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventListener } from '../useEventListener';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('useEventListener', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes', () => {
    const { result } = renderHook(() => useEventListener(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('unmounts clean', () => {
    const { unmount } = renderHook(() => useEventListener(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
