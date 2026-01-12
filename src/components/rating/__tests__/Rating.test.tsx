import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Rating } from '../Rating';

describe('Rating', () => {
  it('renders correct number of stars', () => {
    const { container } = render(<Rating value={3} />);
    expect(container.querySelectorAll('button').length).toBe(5);
  });

  it('renders custom max stars', () => {
    const { container } = render(<Rating value={3} max={10} />);
    expect(container.querySelectorAll('button').length).toBe(10);
  });

  it('calls onChange when star clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<Rating value={2} onChange={onChange} />);
    
    fireEvent.click(container.querySelectorAll('button')[3]);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('is readonly when no onChange', () => {
    const { container } = render(<Rating value={3} readonly />);
    expect(container.querySelectorAll('button')[0]).toBeDisabled();
  });
});
