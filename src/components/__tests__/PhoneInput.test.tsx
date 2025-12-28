import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PhoneInput from '@/components/PhoneInput';

describe('PhoneInput', () => {
  it('renders input', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('formats phone number', () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '11999998888' } });
    expect(onChange).toHaveBeenCalledWith('(11) 99999-8888');
  });

  it('shows country selector', () => {
    render(<PhoneInput value="" onChange={vi.fn()} showCountrySelect />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('validates phone number', () => {
    render(<PhoneInput value="123" onChange={vi.fn()} showValidation />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.getByText(/inválido/i)).toBeInTheDocument();
  });
});
