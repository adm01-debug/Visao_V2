import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../Slider';

describe('Slider', () => {
  it('renders with value', () => {
    render(<Slider value={50} onChange={() => {}} />);
    expect(screen.getByRole('slider')).toHaveValue('50');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<Slider value={50} onChange={onChange} />);
    
    fireEvent.change(screen.getByRole('slider'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('respects min and max', () => {
    render(<Slider value={50} onChange={() => {}} min={10} max={90} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '90');
  });

  it('shows value when showValue is true', () => {
    render(<Slider value={50} onChange={() => {}} showValue />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });
});
