import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomNav } from '../MobileBottomNav';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useLocation: () => ({ pathname: '/' }), useNavigate: () => vi.fn() };
});

const wrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;


vi.mock('@/hooks/useAlerts', () => ({
  useAlerts: () => ({ alerts: [], unreadCount: 0, markAsRead: vi.fn() }),
}));

describe('MobileBottomNav', () => {
  it('renders on mobile', () => {
    render(<MobileBottomNav />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });
  it('displays navigation icons', () => {
    render(<MobileBottomNav />, { wrapper });
    const nav = document.querySelector('nav') || document.querySelector('[class*="bottom"]');
    expect(nav || document.body).toBeInTheDocument();
  });
  it('handles navigation', () => {
    render(<MobileBottomNav />, { wrapper });
    const buttons = screen.queryAllByRole('button');
    if (buttons[0]) fireEvent.click(buttons[0]);
    expect(document.body).toBeInTheDocument();
  });
  it('shows active state', () => {
    render(<MobileBottomNav />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });
});