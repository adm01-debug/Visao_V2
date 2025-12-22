import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStreamRecordings } from '../useStreamRecordings';
import React from 'react';
const cw = () => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return ({ children }: { children: React.ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>); };
describe('useStreamRecordings', () => { beforeEach(() => { vi.clearAllMocks(); }); it('should init', () => { const { result } = renderHook(() => useStreamRecordings(), { wrapper: cw() }); expect(result.current).toBeDefined(); }); });
