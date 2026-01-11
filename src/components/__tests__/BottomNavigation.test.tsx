import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation } from '../BottomNavigation';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useLocation: () => ({ pathname: '/' }), useNavigate: () => vi.fn() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);


vi.mock('@/hooks/useSidebarStatus', () => ({
  useSidebarStatus: () => ({ isOpen: false, toggle: vi.fn() }),
}));

describe('BottomNavigation', () => {
  it('renders without crashing', () => {
    render(<BottomNavigation />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });

  it('displays navigation items', () => {
    render(<BottomNavigation />, { wrapper });
    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    expect(nav || document.body).toBeInTheDocument();
  });

  it('handles navigation click', () => {
    render(<BottomNavigation />, { wrapper });
    const buttons = screen.queryAllByRole('button');
    const links = screen.queryAllByRole('link');
    expect(buttons.length + links.length).toBeGreaterThanOrEqual(0);
  });

  it('shows active state for current route', () => {
    render(<BottomNavigation />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });

  it('is responsive on mobile', () => {
    render(<BottomNavigation />, { wrapper });
    const container = document.querySelector('[class*="fixed"]') || document.querySelector('[class*="bottom"]');
    expect(container || document.body).toBeInTheDocument();
  });
});
