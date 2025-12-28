import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '../toast';

describe('Toast', () => {
  const renderToast = (props = {}) => {
    return render(
      <ToastProvider>
        <Toast {...props}>
          <ToastTitle>Título</ToastTitle>
          <ToastDescription>Descrição</ToastDescription>
          <ToastAction altText="ação">Ação</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  };

  it('deve renderizar corretamente', () => {
    renderToast();
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('deve exibir descrição', () => {
    renderToast();
    expect(screen.getByText('Descrição')).toBeInTheDocument();
  });

  it('deve ter botão de ação', () => {
    renderToast();
    expect(screen.getByText('Ação')).toBeInTheDocument();
  });

  it('deve aplicar variante default', () => {
    renderToast({ variant: 'default' });
    expect(screen.getByText('Título').closest('[data-state]')).toBeInTheDocument();
  });

  it('deve aplicar variante destructive', () => {
    renderToast({ variant: 'destructive' });
    expect(screen.getByText('Título').closest('[class*="destructive"]')).toBeInTheDocument();
  });
});
