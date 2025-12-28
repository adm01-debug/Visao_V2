import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toggle } from '../toggle';

describe('Toggle', () => {
  it('deve renderizar corretamente', () => {
    render(<Toggle>Toggle</Toggle>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('deve exibir texto', () => {
    render(<Toggle>Bold</Toggle>);
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });

  it('deve estar desativado por padrão', () => {
    render(<Toggle>Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'off');
  });

  it('deve aceitar pressed', () => {
    render(<Toggle pressed onPressedChange={() => {}}>Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'on');
  });

  it('deve disparar onPressedChange', () => {
    const handleChange = vi.fn();
    render(<Toggle onPressedChange={handleChange}>Toggle</Toggle>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('deve estar desabilitado', () => {
    render(<Toggle disabled>Toggle</Toggle>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('deve aplicar variante default', () => {
    render(<Toggle variant="default">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('deve aplicar variante outline', () => {
    render(<Toggle variant="outline">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('deve aplicar tamanho default', () => {
    render(<Toggle size="default">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('h-10');
  });

  it('deve aplicar tamanho sm', () => {
    render(<Toggle size="sm">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('h-9');
  });

  it('deve aplicar tamanho lg', () => {
    render(<Toggle size="lg">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
  });

  it('deve aceitar className customizada', () => {
    render(<Toggle className="custom-toggle">Toggle</Toggle>);
    expect(screen.getByRole('button')).toHaveClass('custom-toggle');
  });

  it('deve aceitar aria-label', () => {
    render(<Toggle aria-label="Negrito">B</Toggle>);
    expect(screen.getByLabelText('Negrito')).toBeInTheDocument();
  });
});
