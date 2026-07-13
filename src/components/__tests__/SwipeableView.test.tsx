import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SwipeableView } from '../SwipeableView';

// framer-motion useMotionValue precisa de window matchMedia; setup.ts já provê.
describe('SwipeableView', () => {
  it('renderiza children dentro do wrapper', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <SwipeableView>
          <div>conteudo-swipe</div>
        </SwipeableView>
      </MemoryRouter>,
    );
    expect(getByText('conteudo-swipe')).toBeInTheDocument();
  });

  it('não quebra em rota fora da lista de swipe', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/rota-inexistente']}>
        <SwipeableView>
          <div>ok</div>
        </SwipeableView>
      </MemoryRouter>,
    );
    expect(getByText('ok')).toBeInTheDocument();
  });
});
