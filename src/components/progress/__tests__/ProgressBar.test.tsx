import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with default props', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('[style*="width: 50%"]')).toBeInTheDocument();
  });

  it('renders label when showLabel is true', () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps value to max', () => {
    const { container } = render(<ProgressBar value={150} />);
    expect(container.querySelector('[style*="width: 100%"]')).toBeInTheDocument();
  });

  it('handles zero value', () => {
    const { container } = render(<ProgressBar value={0} />);
    expect(container.querySelector('[style*="width: 0%"]')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(<ProgressBar value={50} variant="success" />);
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});
