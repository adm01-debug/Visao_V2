import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Separator } from '../separator';

describe('Separator', () => {
  it('deve renderizar corretamente', () => {
    render(<Separator data-testid="separator" />);
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('deve ter orientação horizontal por padrão', () => {
    render(<Separator data-testid="separator" />);
    expect(screen.getByTestId('separator')).toHaveClass('h-[1px]', 'w-full');
  });

  it('deve aceitar orientação vertical', () => {
    render(<Separator orientation="vertical" data-testid="separator" />);
    expect(screen.getByTestId('separator')).toHaveClass('h-full', 'w-[1px]');
  });

  it('deve aceitar className', () => {
    render(<Separator className="custom" data-testid="separator" />);
    expect(screen.getByTestId('separator')).toHaveClass('custom');
  });

  it('deve ter role separator', () => {
    render(<Separator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
