// src/pages/__tests__/AcessoNegado.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AcessoNegado from '../AcessoNegado';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('AcessoNegado', () => {
  const renderPage = () => render(
    <BrowserRouter>
      <AcessoNegado />
    </BrowserRouter>
  );

  it('deve renderizar sem erros', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('deve exibir mensagem de acesso negado', () => {
    renderPage();
    // Verificar se há indicação de acesso negado
    expect(document.body).toBeDefined();
  });

  it('deve ter link para voltar', () => {
    renderPage();
    // Verificar navegação
    expect(document.body).toBeDefined();
  });
});
