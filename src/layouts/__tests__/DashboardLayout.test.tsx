import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, logout: vi.fn() }),
}));

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('DashboardLayout', () => {
  it('renders children', () => {
    renderWithRouter(<DashboardLayout><div>Dashboard Content</div></DashboardLayout>);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows sidebar', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows header', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays user name', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('toggles sidebar on mobile', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    const toggle = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('navigation')).toHaveClass('open');
  });
});
