import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, isAuthenticated: true })
}));

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('DashboardLayout', () => {
  it('renders children', () => {
    renderWithRouter(<DashboardLayout><div>Dashboard Content</div></DashboardLayout>);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('has sidebar', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has header', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows user info', () => {
    renderWithRouter(<DashboardLayout><div>Content</div></DashboardLayout>);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
