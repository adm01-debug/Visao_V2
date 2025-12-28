import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContextualHelp from '@/components/ContextualHelp';

describe('ContextualHelp', () => {
  it('renders help icon', () => {
    render(<ContextualHelp content="Help text" />);
    expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<ContextualHelp content="Help text" />);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(await screen.findByText('Help text')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    render(<ContextualHelp content="Help text" />);
    fireEvent.mouseEnter(screen.getByRole('button'));
    await screen.findByText('Help text');
    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });

  it('supports custom trigger', () => {
    render(<ContextualHelp content="Help text" trigger="click" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<ContextualHelp content="Help text" icon={<span data-testid="custom-icon">?</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
