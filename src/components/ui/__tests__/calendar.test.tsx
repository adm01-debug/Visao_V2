import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Calendar } from '../calendar';

describe('Calendar', () => {
  it('deve renderizar corretamente', () => {
    render(<Calendar />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('deve exibir mês atual', () => {
    const { container } = render(<Calendar />);
    expect(container.querySelector('[class*="caption"]')).toBeInTheDocument();
  });

  it('deve aceitar selected date', () => {
    const date = new Date(2025, 0, 15);
    render(<Calendar selected={date} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('deve aceitar mode single', () => {
    render(<Calendar mode="single" />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('deve aceitar className', () => {
    render(<Calendar className="custom-calendar" />);
    expect(screen.getByRole('grid').closest('.custom-calendar')).toBeInTheDocument();
  });
});
