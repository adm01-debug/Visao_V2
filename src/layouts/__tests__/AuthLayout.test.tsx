import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('AuthLayout', () => {
  it('renders children', () => {
    renderWithRouter(<AuthLayout><div>Login Form</div></AuthLayout>);
    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  it('has auth container', () => {
    renderWithRouter(<AuthLayout><div>Content</div></AuthLayout>);
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
  });

  it('shows logo', () => {
    renderWithRouter(<AuthLayout><div>Content</div></AuthLayout>);
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
  });
});
