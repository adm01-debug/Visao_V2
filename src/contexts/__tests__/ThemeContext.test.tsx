import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

const TestComponent = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  it('provides default theme', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('allows setting theme', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Set Dark'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('toggles theme', () => {
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('persists theme preference', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<ThemeProvider><TestComponent /></ThemeProvider>);
    fireEvent.click(screen.getByText('Set Dark'));
    expect(setItem).toHaveBeenCalled();
  });
});
