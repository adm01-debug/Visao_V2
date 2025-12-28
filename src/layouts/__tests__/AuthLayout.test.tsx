import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('AuthLayout', () => {
  it('renders children', () => {
    renderWithRouter(<AuthLayout><div>Auth Content</div></AuthLayout>);
    expect(screen.getByText('Auth Content')).toBeInTheDocument();
  });

  it('displays logo', () => {
    renderWithRouter(<AuthLayout><div>Content</div></AuthLayout>);
    expect(screen.getByRole('img', { name: /logo/i })).toBeInTheDocument();
  });

  it('has centered layout', () => {
    const { container } = renderWithRouter(<AuthLayout><div>Content</div></AuthLayout>);
    expect(container.firstChild).toHaveClass('auth-layout');
  });

  it('shows footer links', () => {
    renderWithRouter(<AuthLayout><div>Content</div></AuthLayout>);
    expect(screen.getByText(/termos/i)).toBeInTheDocument();
  });
});
