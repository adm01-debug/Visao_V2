import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../carousel';

describe('Carousel', () => {
  const renderCarousel = () => render(
    <Carousel>
      <CarouselContent>
        <CarouselItem>Slide 1</CarouselItem>
        <CarouselItem>Slide 2</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );

  it('deve renderizar corretamente', () => {
    renderCarousel();
    expect(screen.getByText('Slide 1')).toBeInTheDocument();
  });

  it('deve exibir slides', () => {
    renderCarousel();
    expect(screen.getByText('Slide 2')).toBeInTheDocument();
  });

  it('deve ter botões de navegação', () => {
    renderCarousel();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
