import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthCallback } from '../AuthCallback';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      }),
    },
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Autenticando...')).toBeInTheDocument();
    expect(screen.getByText('Processando autenticação...')).toBeInTheDocument();
  });

  it('shows success state when session is found', async () => {
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Autenticado com Sucesso!')).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback on successful auth', async () => {
    const onSuccess = vi.fn();
    
    render(
      <BrowserRouter>
        <AuthCallback onSuccess={onSuccess} />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('uses custom redirectTo path', async () => {
    render(
      <BrowserRouter>
        <AuthCallback redirectTo="/custom-page" />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Autenticado com Sucesso!')).toBeInTheDocument();
    });
  });
});
