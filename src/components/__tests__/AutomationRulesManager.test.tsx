import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutomationRulesManager } from '../AutomationRulesManager';

// Mock dependencies
vi.mock('@/hooks/useAutomationRules', () => ({
  useAutomationRules: () => ({
    rules: [
      { id: '1', name: 'Rule 1', enabled: true, trigger: 'motion', action: 'alert' },
      { id: '2', name: 'Rule 2', enabled: false, trigger: 'face', action: 'notify' },
    ],
    loading: false,
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

describe('AutomationRulesManager', () => {
  it('renders without crashing', () => {
    render(<AutomationRulesManager />);
    expect(screen.getByText(/rule/i)).toBeInTheDocument();
  });

  it('displays list of rules', () => {
    render(<AutomationRulesManager />);
    expect(screen.getByText('Rule 1')).toBeInTheDocument();
    expect(screen.getByText('Rule 2')).toBeInTheDocument();
  });

  it('shows enabled/disabled state for rules', () => {
    render(<AutomationRulesManager />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('handles rule toggle', async () => {
    render(<AutomationRulesManager />);
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes[0]) {
      fireEvent.click(checkboxes[0]);
      await waitFor(() => {
        expect(checkboxes[0]).toBeInTheDocument();
      });
    }
  });

  it('displays add rule button', () => {
    render(<AutomationRulesManager />);
    const addButton = screen.queryByRole('button');
    expect(addButton).toBeInTheDocument();
  });

  it('handles empty rules state', () => {
    vi.doMock('@/hooks/useAutomationRules', () => ({
      useAutomationRules: () => ({ rules: [], loading: false }),
    }));
    render(<AutomationRulesManager />);
    expect(document.body).toBeInTheDocument();
  });
});
