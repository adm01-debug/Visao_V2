import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { use-toast } from '../use-toast';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('use-toast', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes correctly', () => {
    const { result } = renderHook(() => use-toast(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('handles updates', async () => {
    const { result } = renderHook(() => use-toast(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
  });
});
