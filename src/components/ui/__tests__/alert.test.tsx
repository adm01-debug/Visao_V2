import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '../alert';

describe('Alert', () => {
  it('deve renderizar corretamente', () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('deve renderizar título', () => {
    render(<Alert><AlertTitle>Título</AlertTitle></Alert>);
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('deve renderizar descrição', () => {
    render(<Alert><AlertDescription>Descrição</AlertDescription></Alert>);
    expect(screen.getByText('Descrição')).toBeInTheDocument();
  });

  it('deve aplicar variante default', () => {
    render(<Alert variant="default">Alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('bg-background');
  });

  it('deve aplicar variante destructive', () => {
    render(<Alert variant="destructive">Alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('border-destructive');
  });

  it('deve aceitar className customizada', () => {
    render(<Alert className="custom-alert">Alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('custom-alert');
  });

  it('deve ter classes base', () => {
    render(<Alert>Alert</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('relative', 'w-full', 'rounded-lg');
  });
});
