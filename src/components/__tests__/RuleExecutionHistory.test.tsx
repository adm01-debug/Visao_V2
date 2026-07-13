import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RuleExecutionHistory } from '../RuleExecutionHistory';

vi.mock('@/hooks/useRuleExecutions', () => ({
  useRuleExecutions: () => ({
    executions: [],
    loading: false,
    refetch: vi.fn(),
    getStats: () => ({ total: 0, success: 0, failed: 0, pending: 0, successRate: 0 }),
  }),
}));


vi.mock('@/hooks/useRules', () => ({
  useRules: () => ({ rules: [], loading: false }),
}));


describe('RuleExecutionHistory', () => {
  it('renderiza sem erros com histórico vazio', () => {
    const { container } = render(<RuleExecutionHistory />);
    expect(container.firstChild).toBeTruthy();
  });
});
