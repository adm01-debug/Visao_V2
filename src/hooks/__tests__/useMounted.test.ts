import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMounted } from '../useMounted';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('useMounted', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes', () => {
    const { result } = renderHook(() => useMounted(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('unmounts clean', () => {
    const { unmount } = renderHook(() => useMounted(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
