import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('deve renderizar corretamente', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('deve estar desmarcado por padrão', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('deve aceitar checked', () => {
    render(<Checkbox checked onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('deve disparar onCheckedChange', () => {
    const handleChange = vi.fn();
    render(<Checkbox onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar desabilitado', () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('não deve mudar quando desabilitado', () => {
    const handleChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('deve aceitar className customizada', () => {
    render(<Checkbox className="custom-checkbox" />);
    expect(screen.getByRole('checkbox')).toHaveClass('custom-checkbox');
  });

  it('deve ter classes base', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toHaveClass('h-4', 'w-4');
  });

  it('deve aceitar aria-label', () => {
    render(<Checkbox aria-label="Aceitar termos" />);
    expect(screen.getByLabelText('Aceitar termos')).toBeInTheDocument();
  });

  it('deve aceitar id', () => {
    render(<Checkbox id="my-checkbox" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'my-checkbox');
  });
});
