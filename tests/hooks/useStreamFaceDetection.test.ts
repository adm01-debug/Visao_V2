import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamFaceDetection } from '../useStreamFaceDetection';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

describe('useStreamFaceDetection', () => {
  beforeEach(() => { qc.clear(); vi.clearAllMocks(); });
  it('initializes correctly', () => {
    const { result } = renderHook(() => useStreamFaceDetection(), { wrapper });
    expect(result.current).toBeDefined();
  });
  it('handles updates', async () => {
    const { result } = renderHook(() => useStreamFaceDetection(), { wrapper });
    await waitFor(() => expect(result.current).toBeDefined());
  });
  it('cleans up', () => {
    const { unmount } = renderHook(() => useStreamFaceDetection(), { wrapper });
    expect(() => unmount()).not.toThrow();
  });
});
