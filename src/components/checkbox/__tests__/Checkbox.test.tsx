import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders unchecked', () => {
    render(<Checkbox checked={false} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('renders checked', () => {
    render(<Checkbox checked={true} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange on click', () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders label', () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });
});
