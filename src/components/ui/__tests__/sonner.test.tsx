import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toaster } from '../sonner';

describe('Sonner Toaster', () => {
  it('deve renderizar corretamente', () => {
    expect(() => render(<Toaster />)).not.toThrow();
  });

  it('deve montar componente', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar position', () => {
    expect(() => render(<Toaster position="top-right" />)).not.toThrow();
  });

  it('deve aceitar theme', () => {
    expect(() => render(<Toaster theme="dark" />)).not.toThrow();
  });

  it('deve aceitar richColors', () => {
    expect(() => render(<Toaster richColors />)).not.toThrow();
  });
});
