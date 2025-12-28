import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ErrorLayout from '@/layouts/ErrorLayout';

const renderWithRouter = (component: React.ReactNode) => 
  render(<BrowserRouter>{component}</BrowserRouter>);

describe('ErrorLayout', () => {
  it('renders error content', () => {
    renderWithRouter(<ErrorLayout><div>Error Message</div></ErrorLayout>);
    expect(screen.getByText('Error Message')).toBeInTheDocument();
  });

  it('has error container', () => {
    renderWithRouter(<ErrorLayout><div>Error</div></ErrorLayout>);
    expect(screen.getByTestId('error-layout')).toBeInTheDocument();
  });

  it('shows back to home link', () => {
    renderWithRouter(<ErrorLayout><div>Error</div></ErrorLayout>);
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
  });
});
