import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from '../switch';

describe('Switch', () => {
  it('deve renderizar corretamente', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('deve estar desligado por padrão', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
  });

  it('deve aceitar checked', () => {
    render(<Switch checked onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });

  it('deve disparar onCheckedChange', () => {
    const handleChange = vi.fn();
    render(<Switch onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar desabilitado', () => {
    render(<Switch disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('não deve mudar quando desabilitado', () => {
    const handleChange = vi.fn();
    render(<Switch disabled onCheckedChange={handleChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('deve aceitar className customizada', () => {
    render(<Switch className="custom-switch" />);
    expect(screen.getByRole('switch')).toHaveClass('custom-switch');
  });

  it('deve ter classes base', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toHaveClass('peer', 'inline-flex');
  });

  it('deve aceitar aria-label', () => {
    render(<Switch aria-label="Ativar notificações" />);
    expect(screen.getByLabelText('Ativar notificações')).toBeInTheDocument();
  });

  it('deve aceitar defaultChecked', () => {
    render(<Switch defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
  });
});
