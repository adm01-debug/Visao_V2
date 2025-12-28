import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MaskedInput from '@/components/MaskedInput';

describe('MaskedInput', () => {
  it('renders input', () => {
    render(<MaskedInput mask="999.999.999-99" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('applies mask on input', () => {
    const onChange = vi.fn();
    render(<MaskedInput mask="999.999.999-99" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '12345678901' } });
    expect(onChange).toHaveBeenCalledWith('123.456.789-01');
  });

  it('validates format', () => {
    render(<MaskedInput mask="999.999.999-99" onChange={vi.fn()} showValidation />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '123' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it('shows placeholder with mask pattern', () => {
    render(<MaskedInput mask="999.999.999-99" onChange={vi.fn()} placeholder="CPF" />);
    expect(screen.getByPlaceholderText('CPF')).toBeInTheDocument();
  });
});
