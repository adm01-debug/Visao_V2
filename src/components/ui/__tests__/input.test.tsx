import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../input';

describe('Input', () => {
  it('deve renderizar corretamente', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('deve aceitar placeholder', () => {
    render(<Input placeholder="Digite aqui..." />);
    expect(screen.getByPlaceholderText('Digite aqui...')).toBeInTheDocument();
  });

  it('deve aceitar valor', () => {
    render(<Input value="test value" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('test value');
  });

  it('deve disparar onChange', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar desabilitado', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('deve aceitar tipo text', () => {
    render(<Input type="text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('deve aceitar tipo email', () => {
    render(<Input type="email" data-testid="email-input" />);
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
  });

  it('deve aceitar tipo password', () => {
    render(<Input type="password" data-testid="password-input" />);
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
  });

  it('deve aceitar className customizada', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('deve ter classes base', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveClass('flex', 'h-10', 'w-full');
  });

  it('deve ser readonly', () => {
    render(<Input readOnly value="readonly" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('deve aceitar maxLength', () => {
    render(<Input maxLength={10} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10');
  });

  it('deve aceitar aria-label', () => {
    render(<Input aria-label="Nome completo" />);
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });

  it('deve disparar onFocus', () => {
    const handleFocus = vi.fn();
    render(<Input onFocus={handleFocus} />);
    fireEvent.focus(screen.getByRole('textbox'));
    expect(handleFocus).toHaveBeenCalled();
  });

  it('deve disparar onBlur', () => {
    const handleBlur = vi.fn();
    render(<Input onBlur={handleBlur} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(handleBlur).toHaveBeenCalled();
  });
});
