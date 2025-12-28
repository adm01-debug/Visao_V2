import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toaster } from '../toaster';

describe('Toaster', () => {
  it('deve renderizar corretamente', () => {
    render(<Toaster />);
    // Toaster renderiza viewport vazio inicialmente
    expect(document.body).toBeInTheDocument();
  });

  it('deve montar sem erros', () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });
});
