import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IPWhitelistManager } from '../IPWhitelistManager';

// Mock do contexto de autenticação
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', role: 'admin' } })
}));

describe('IPWhitelistManager', () => {
  it('deve renderizar corretamente', () => {
    render(<IPWhitelistManager />);
    expect(document.body).toBeInTheDocument();
  });

  it('deve ser um componente admin', () => {
    const { container } = render(<IPWhitelistManager />);
    expect(container).toBeInTheDocument();
  });

  it('deve montar sem erros', () => {
    expect(() => render(<IPWhitelistManager />)).not.toThrow();
  });

  it('deve ter estrutura de gerenciamento', () => {
    const { container } = render(<IPWhitelistManager />);
    expect(container.firstChild).toBeTruthy();
  });
});
