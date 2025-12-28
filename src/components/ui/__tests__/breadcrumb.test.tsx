import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../breadcrumb';

describe('Breadcrumb', () => {
  const renderBreadcrumb = () => render(
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  it('deve renderizar corretamente', () => {
    renderBreadcrumb();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('deve exibir links', () => {
    renderBreadcrumb();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('deve exibir página atual', () => {
    renderBreadcrumb();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });
});
