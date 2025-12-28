import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../pagination';

describe('Pagination', () => {
  const renderPagination = () => render(
    <Pagination>
      <PaginationContent>
        <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
        <PaginationItem><PaginationNext href="#" /></PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  it('deve renderizar pagination', () => {
    renderPagination();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('deve exibir links de página', () => {
    renderPagination();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
