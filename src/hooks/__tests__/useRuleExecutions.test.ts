import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRuleExecutions } from '../useRuleExecutions';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('useRuleExecutions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useRuleExecutions('rule-1'));
    
    expect(result.current.executions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('fetches executions for a rule', async () => {
    const { result } = renderHook(() => useRuleExecutions('rule-1'));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('provides refresh function', () => {
    const { result } = renderHook(() => useRuleExecutions('rule-1'));
    
    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('handles empty rule id', () => {
    const { result } = renderHook(() => useRuleExecutions(''));
    
    expect(result.current.executions).toEqual([]);
  });
});
