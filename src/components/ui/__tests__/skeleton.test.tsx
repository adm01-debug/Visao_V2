import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from '../skeleton';

describe('Skeleton', () => {
  it('deve renderizar corretamente', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('deve ter classes base', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted');
  });

  it('deve aceitar className customizada', () => {
    render(<Skeleton className="h-10 w-full" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-10', 'w-full');
  });

  it('deve aceitar height e width inline', () => {
    render(<Skeleton className="h-4 w-[250px]" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-4');
  });

  it('deve renderizar como div', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton').tagName).toBe('DIV');
  });

  it('deve aceitar qualquer prop HTML', () => {
    render(<Skeleton data-testid="skeleton" aria-label="Carregando" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Carregando');
  });
});
