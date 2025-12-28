import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  it('deve renderizar corretamente', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('deve aceitar placeholder', () => {
    render(<Textarea placeholder="Digite sua mensagem..." />);
    expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeInTheDocument();
  });

  it('deve aceitar valor', () => {
    render(<Textarea value="Texto de teste" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('Texto de teste');
  });

  it('deve disparar onChange', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'novo texto' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('deve estar desabilitado', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('deve aceitar rows', () => {
    render(<Textarea rows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('deve aceitar className customizada', () => {
    render(<Textarea className="custom-textarea" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-textarea');
  });

  it('deve ter classes base', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toHaveClass('flex', 'min-h-[80px]', 'w-full');
  });

  it('deve aceitar maxLength', () => {
    render(<Textarea maxLength={500} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500');
  });

  it('deve aceitar aria-label', () => {
    render(<Textarea aria-label="Comentário" />);
    expect(screen.getByLabelText('Comentário')).toBeInTheDocument();
  });
});
