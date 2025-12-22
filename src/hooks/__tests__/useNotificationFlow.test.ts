import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationFlow } from '../useNotificationFlow';
import React from 'react';
const createWrapper = () => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return ({ children }: { children: React.ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>); };
describe('useNotificationFlow', () => { beforeEach(() => { vi.clearAllMocks(); }); it('should return initial state', () => { const { result } = renderHook(() => useNotificationFlow(), { wrapper: createWrapper() }); expect(result.current).toBeDefined(); }); it('should handle state', () => { const { result } = renderHook(() => useNotificationFlow(), { wrapper: createWrapper() }); expect(typeof result.current).toBe('object'); }); });
