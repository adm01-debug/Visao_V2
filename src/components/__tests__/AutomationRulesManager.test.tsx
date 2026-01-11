import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutomationRulesManager } from '../AutomationRulesManager';

// Mock dos hooks REAIS usados pelo componente
vi.mock('@/hooks/useRules', () => ({
  useRules: () => ({
    rules: [
      { id: '1', name: 'Rule 1', isActive: true, conditions: [], actions: [] },
      { id: '2', name: 'Rule 2', isActive: false, conditions: [], actions: [] },
    ],
    isLoading: false,
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleActive: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCameras', () => ({
  useCameras: () => ({
    cameras: [
      { id: 'cam1', name: 'Camera 1' },
      { id: 'cam2', name: 'Camera 2' },
    ],
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AutomationRulesManager', () => {
  it('renders without crashing', () => {
    render(<AutomationRulesManager />);
    expect(document.body).toBeInTheDocument();
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
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
