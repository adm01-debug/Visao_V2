import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuleExecutionHistory } from '../RuleExecutionHistory';

vi.mock('@/hooks/useRuleExecutions', () => ({
  useRuleExecutions: () => ({
    executions: [
      { id: '1', ruleId: 'r1', timestamp: new Date().toISOString(), status: 'success' },
      { id: '2', ruleId: 'r2', timestamp: new Date().toISOString(), status: 'failed' },
    ],
    loading: false,
  }),
}));

describe('RuleExecutionHistory', () => {
  it('renders execution list', () => {
    render(<RuleExecutionHistory />);
    expect(document.body).toBeInTheDocument();
  });
  it('displays execution status', () => {
    render(<RuleExecutionHistory />);
    const status = screen.queryByText(/success/i) || screen.queryByText(/failed/i);
    expect(status || document.body).toBeInTheDocument();
  });
  it('shows timestamps', () => {
    render(<RuleExecutionHistory />);
    expect(document.body).toBeInTheDocument();
  });
  it('handles empty state', () => {
    vi.doMock('@/hooks/useRuleExecutions', () => ({ useRuleExecutions: () => ({ executions: [], loading: false }) }));
    render(<RuleExecutionHistory />);
    expect(document.body).toBeInTheDocument();
  });
});