import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';

describe('Card', () => {
  it('deve renderizar corretamente', () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('deve renderizar header', () => {
    render(<Card><CardHeader>Header</CardHeader></Card>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('deve renderizar title', () => {
    render(<Card><CardHeader><CardTitle>Título</CardTitle></CardHeader></Card>);
    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('deve renderizar description', () => {
    render(<Card><CardHeader><CardDescription>Descrição</CardDescription></CardHeader></Card>);
    expect(screen.getByText('Descrição')).toBeInTheDocument();
  });

  it('deve renderizar content', () => {
    render(<Card><CardContent>Conteúdo</CardContent></Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('deve renderizar footer', () => {
    render(<Card><CardFooter>Footer</CardFooter></Card>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('deve aceitar className', () => {
    render(<Card className="custom-card" data-testid="card">Card</Card>);
    expect(screen.getByTestId('card')).toHaveClass('custom-card');
  });

  it('deve ter classes base', () => {
    render(<Card data-testid="card">Card</Card>);
    expect(screen.getByTestId('card')).toHaveClass('rounded-lg', 'border', 'bg-card');
  });
});
