import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LazyLoad } from '../LazyLoad';

vi.mock('@/hooks/usePerformance', () => ({
  useInView: () => [vi.fn(), true],
}));

describe('LazyLoad', () => {
  it('renderiza children quando em viewport', () => {
    render(
      <LazyLoad>
        <span>conteudo-lazy</span>
      </LazyLoad>,
    );
    expect(screen.getByText('conteudo-lazy')).toBeInTheDocument();
  });

  it('aceita className customizada', () => {
    const { container } = render(
      <LazyLoad className="minha-classe">
        <span>x</span>
      </LazyLoad>,
    );
    expect(container.firstChild).toHaveClass('minha-classe');
  });
});
