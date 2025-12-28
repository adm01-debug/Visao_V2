import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('deve renderizar corretamente', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('deve exibir texto do children', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('deve aplicar variante default', () => {
    render(<Button variant="default">Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('deve aplicar variante destructive', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('deve aplicar variante outline', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('deve aplicar variante secondary', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });

  it('deve aplicar variante ghost', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
  });

  it('deve aplicar variante link', () => {
    render(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-primary');
  });

  it('deve aplicar tamanho default', () => {
    render(<Button size="default">Default Size</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');
  });

  it('deve aplicar tamanho sm', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9');
  });

  it('deve aplicar tamanho lg', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
  });

  it('deve aplicar tamanho icon', () => {
    render(<Button size="icon">🔥</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
  });

  it('deve disparar onClick', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('não deve disparar onClick quando desabilitado', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deve aceitar className customizada', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('deve renderizar como child com asChild', () => {
    render(<Button asChild><a href="/test">Link Button</a></Button>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('deve ter tipo button por padrão', () => {
    render(<Button>Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('deve aceitar tipo submit', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
