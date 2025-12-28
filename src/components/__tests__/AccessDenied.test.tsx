import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AccessDenied from '@/components/AccessDenied';

const renderWithRouter = (component: React.ReactNode) => render(<BrowserRouter>{component}</BrowserRouter>);

describe('AccessDenied', () => {
  it('renders access denied message', () => {
    renderWithRouter(<AccessDenied />);
    expect(screen.getByText(/acesso negado/i)).toBeInTheDocument();
  });

  it('displays 403 error code', () => {
    renderWithRouter(<AccessDenied />);
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('shows back button', () => {
    renderWithRouter(<AccessDenied />);
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument();
  });

  it('displays custom message when provided', () => {
    renderWithRouter(<AccessDenied message="Sem permissão" />);
    expect(screen.getByText('Sem permissão')).toBeInTheDocument();
  });
});
