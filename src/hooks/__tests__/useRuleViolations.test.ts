import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRuleViolations } from '../useRuleViolations';
import React from 'react';
const cw = () => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return ({ children }: { children: React.ReactNode }) => (<QueryClientProvider client={qc}>{children}</QueryClientProvider>); };
describe('useRuleViolations', () => { beforeEach(() => { vi.clearAllMocks(); }); it('should init', () => { const { result } = renderHook(() => useRuleViolations(), { wrapper: cw() }); expect(result.current).toBeDefined(); }); it('should work', () => { const { result } = renderHook(() => useRuleViolations(), { wrapper: cw() }); expect(typeof result.current).toBe('object'); }); });
