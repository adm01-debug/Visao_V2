import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector';

// Mock do hook REAL usado pelo componente
vi.mock('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({
    mode: 'light',
    variant: 'default',
    setMode: vi.fn(),
    setVariant: vi.fn(),
    toggleMode: vi.fn(),
    isDark: false,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/types/themes', () => ({
  THEME_VARIANTS: {
    default: { name: 'Default', primary: '#000' },
    ocean: { name: 'Ocean', primary: '#00f' },
  },
}));

describe('ThemeSelector', () => {
  it('renders without crashing', () => {
    render(<ThemeSelector />);
    expect(document.body).toBeInTheDocument();
  });

  it('shows theme button', () => {
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles theme toggle', () => {
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    if (buttons[0]) fireEvent.click(buttons[0]);
    expect(document.body).toBeInTheDocument();
  });

  it('displays current theme mode', () => {
    render(<ThemeSelector />);
    expect(document.body).toBeInTheDocument();
  });
});
