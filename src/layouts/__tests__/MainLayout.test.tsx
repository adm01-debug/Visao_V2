import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('MainLayout', () => {
  it('renders children', () => {
    renderWithRouter(<MainLayout><div>Main Content</div></MainLayout>);
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('has header', () => {
    renderWithRouter(<MainLayout><div>Content</div></MainLayout>);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('has footer', () => {
    renderWithRouter(<MainLayout><div>Content</div></MainLayout>);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('has main content area', () => {
    renderWithRouter(<MainLayout><div>Content</div></MainLayout>);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
