import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DatePicker } from '../DatePicker';

describe('DatePicker', () => {
  it('renders input', () => {
    render(<DatePicker value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<DatePicker value="" onChange={onChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '2026-01-15' } });
    
    expect(onChange).toHaveBeenCalledWith('2026-01-15');
  });

  it('respects min and max props', () => {
    render(<DatePicker value="" onChange={() => {}} min="2026-01-01" max="2026-12-31" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('min', '2026-01-01');
    expect(input).toHaveAttribute('max', '2026-12-31');
  });

  it('can be disabled', () => {
    render(<DatePicker value="" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
