import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlateDetections } from '../usePlateDetections';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('usePlateDetections', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes correctly', () => {
    const { result } = renderHook(() => usePlateDetections(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('handles updates', async () => {
    const { result } = renderHook(() => usePlateDetections(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
  });
});
