import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RuleExecutionHistory } from '../RuleExecutionHistory';

vi.mock('@/hooks/useRuleExecutions', () => ({
  useRuleExecutions: () => ({
    executions: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('RuleExecutionHistory', () => {
  it('renderiza sem erros com histórico vazio', () => {
    const { container } = render(<RuleExecutionHistory />);
    expect(container.firstChild).toBeTruthy();
  });
});
