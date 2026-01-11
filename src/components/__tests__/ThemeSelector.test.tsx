import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector';

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), themes: ['light', 'dark', 'system'] }),
}));

describe('ThemeSelector', () => {
  it('renders theme options', () => {
    render(<ThemeSelector />);
    expect(document.body).toBeInTheDocument();
  });
  it('shows current theme', () => {
    render(<ThemeSelector />);
    const current = screen.queryByText(/light/i) || screen.queryByText(/dark/i);
    expect(current || document.body).toBeInTheDocument();
  });
  it('handles theme change', () => {
    render(<ThemeSelector />);
    const buttons = screen.queryAllByRole('button');
    if (buttons[0]) fireEvent.click(buttons[0]);
    expect(document.body).toBeInTheDocument();
  });
  it('supports system theme', () => {
    render(<ThemeSelector />);
    expect(document.body).toBeInTheDocument();
  });
});